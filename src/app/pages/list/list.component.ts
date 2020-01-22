import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { merge, Observable, of, timer } from 'rxjs'
import { filter, map, switchMap } from 'rxjs/operators'
import { Store } from '@ngrx/store'
import { Actions, ofType } from '@ngrx/effects'
import { range } from 'lodash'
import * as moment from 'moment'
import { TezosNetwork } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'

import { ChainNetworkService } from '@tezblock/services/chain-network/chain-network.service'
import { BaseComponent } from '@tezblock/components/base.component'
import { BlockService } from '@tezblock/services/blocks/blocks.service'
import { TransactionService } from '@tezblock/services/transaction/transaction.service'
import { Tab } from '@tezblock/components/tabbed-table/tabbed-table.component'
import { ApiService } from '@tezblock/services/api/api.service'
import * as fromRoot from '@tezblock/reducers'
import * as actions from './actions'
import { refreshRate } from '@tezblock/services/facade/facade'
import { Column } from '@tezblock/components/tezblock-table2/tezblock-table2.component'
import { toArray } from '@tezblock/services/fp'
import { columns } from './table-definitions'
import { OperationTypes } from '@tezblock/domain/operations'

const noOfDays = 7

//TODO: create some shared file for it
const getRefresh = (streams: Observable<any>[]): Observable<number> =>
  merge(of(-1), merge(streams).pipe(switchMap(() => timer(refreshRate, refreshRate))))

const timestampsToCountsPerDay = (timestamps: number[]): number[] => {
  const diffsInDays = timestamps.map(timestamp => moment().diff(moment(timestamp), 'days'))

  return range(0, noOfDays).map(index => diffsInDays.filter(diffsInDay => diffsInDay === index).length)
}

const timestampsToChartDataSource = (label: string) => (timestamps: number[]): { data: number[]; label: string } => ({
  data: timestampsToCountsPerDay(timestamps),
  label: label
})

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent extends BaseComponent implements OnInit {
  tabs: Tab[]
  columns: Column[]
  loading$: Observable<boolean>
  data$: Observable<Object>
  transactionsLoading$: Observable<boolean>
  showLoadMore$: Observable<boolean>
  totalActiveBakers$: Observable<number>
  activationsCountLast24h$: Observable<number>
  originationsCountLast24h$: Observable<number>
  transactionsCountLast24h$: Observable<number>
  activationsChartDatasets$: Observable<{ data: number[]; label: string }[]>
  originationsChartDatasets$: Observable<{ data: number[]; label: string }[]>
  transactionsChartDatasets$: Observable<{ data: number[]; label: string }[]>
  routeName$: Observable<string>

  readonly chartLabels: string[] = range(0, noOfDays).map(index =>
    moment()
      .add(-index, 'days')
      .format('DD.MM.YYYY')
  )

  private dataService

  private get routeName(): string {
    return this.route.snapshot.paramMap.get('route')
  }

  private get isMainnet(): boolean {
    return this.chainNetworkService.getNetwork() === TezosNetwork.MAINNET
  }

  constructor(
    private readonly actions$: Actions,
    private readonly apiService: ApiService,
    private readonly chainNetworkService: ChainNetworkService,
    private readonly route: ActivatedRoute,
    private readonly store$: Store<fromRoot.State>
  ) {
    super()
    this.store$.dispatch(actions.reset())
  }

  ngOnInit() {
    // is this refresh rly good .. ?
    const refresh$ = merge(
      of(1),
      merge(
        this.actions$.pipe(ofType(actions.loadActiveBakersFailed)),
        this.actions$.pipe(ofType(actions.loadActiveBakersSucceeded)),
        this.actions$.pipe(ofType(actions.loadDoubleBakingsFailed)),
        this.actions$.pipe(ofType(actions.loadDoubleBakingsSucceeded)),
        this.actions$.pipe(ofType(actions.loadDoubleEndorsementsFailed)),
        this.actions$.pipe(ofType(actions.loadDoubleEndorsementsSucceeded))
      ).pipe(switchMap(() => timer(refreshRate, refreshRate)))
    )

    this.routeName$ = this.route.paramMap.pipe(map(paramMap => paramMap.get('route')))

    this.routeName$.subscribe(routeName => {
      try {
        switch (routeName) {
          case 'block':
            this.dataService = new BlockService(this.apiService)
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Block]({ showFiatValue: this.isMainnet }))
            break
          case 'transaction':
            this.subscriptions.push(
              getRefresh([
                this.actions$.pipe(ofType(actions.loadTransactionsCountLast24hSucceeded)),
                this.actions$.pipe(ofType(actions.loadTransactionsCountLast24hFailed))
              ]).subscribe(() => this.store$.dispatch(actions.loadTransactionsCountLast24h())),
              getRefresh([
                this.actions$.pipe(ofType(actions.loadTransactionsCountLastXdSucceeded)),
                this.actions$.pipe(ofType(actions.loadTransactionsCountLastXdFailed))
              ]).subscribe(() => this.store$.dispatch(actions.loadTransactionsCountLastXd()))
            )
            this.transactionsCountLast24h$ = this.store$.select(state => state.list.transactionsCountLast24h)
            this.transactionsChartDatasets$ = this.store$
              .select(state => state.list.transactionsCountLastXd)
              .pipe(
                filter(Array.isArray),
                map(timestampsToChartDataSource(`Transactions`)),
                map(toArray)
              )
            this.dataService = new TransactionService(this.apiService)
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Transaction]({ showFiatValue: this.isMainnet }))
            break
          case 'activation':
            this.subscriptions.push(
              getRefresh([
                this.actions$.pipe(ofType(actions.loadActivationsCountLast24hSucceeded)),
                this.actions$.pipe(ofType(actions.loadActivationsCountLast24hFailed))
              ]).subscribe(() => this.store$.dispatch(actions.loadActivationsCountLast24h())),
              getRefresh([
                this.actions$.pipe(ofType(actions.loadActivationsCountLastXdSucceeded)),
                this.actions$.pipe(ofType(actions.loadActivationsCountLastXdFailed))
              ]).subscribe(() => this.store$.dispatch(actions.loadActivationsCountLastXd()))
            )
            this.activationsCountLast24h$ = this.store$.select(state => state.list.activationsCountLast24h)
            this.activationsChartDatasets$ = this.store$
              .select(state => state.list.activationsCountLastXd)
              .pipe(
                filter(Array.isArray),
                map(timestampsToChartDataSource(`Activations`)),
                map(toArray)
              )
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['activate_account'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Activation]({ showFiatValue: this.isMainnet }))
            break
          case 'origination':
            this.subscriptions.push(
              getRefresh([
                this.actions$.pipe(ofType(actions.loadOriginationsCountLast24hSucceeded)),
                this.actions$.pipe(ofType(actions.loadOriginationsCountLast24hFailed))
              ]).subscribe(() => this.store$.dispatch(actions.loadOriginationsCountLast24h())),
              getRefresh([
                this.actions$.pipe(ofType(actions.loadOriginationsCountLastXdSucceeded)),
                this.actions$.pipe(ofType(actions.loadOriginationsCountLastXdFailed))
              ]).subscribe(() => this.store$.dispatch(actions.loadOriginationsCountLastXd()))
            )
            this.originationsCountLast24h$ = this.store$.select(state => state.list.originationsCountLast24h)
            this.originationsChartDatasets$ = this.store$
              .select(state => state.list.originationsCountLastXd)
              .pipe(
                filter(Array.isArray),
                map(timestampsToChartDataSource(`Originations`)),
                map(toArray)
              )
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['origination'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Origination]({ showFiatValue: this.isMainnet }))
            break
          case 'delegation':
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['delegation'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Delegation]({ showFiatValue: this.isMainnet }))
            break
          case 'endorsement':
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['endorsement'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Endorsement]({ showFiatValue: this.isMainnet }))
            break
          case 'vote':
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['ballot', 'proposals'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Ballot]({ showFiatValue: this.isMainnet }))
            break
          case 'double-baking':
            const dbLoading$ = this.store$.select(state => state.list.doubleBakings.loading)
            const dbData$ = this.store$.select(state => state.list.doubleBakings.data)

            this.subscriptions.push(refresh$.subscribe(() => this.store$.dispatch(actions.loadDoubleBakings())))
            this.setupTable(columns[OperationTypes.DoubleBakingEvidenceOverview]({ showFiatValue: this.isMainnet }), dbData$, dbLoading$)
            break
          case 'double-endorsement':
            const deLoading$ = this.store$.select(state => state.list.doubleEndorsements.loading)
            const deData$ = this.store$.select(state => state.list.doubleEndorsements.data)

            this.subscriptions.push(refresh$.subscribe(() => this.store$.dispatch(actions.loadDoubleEndorsements())))
            this.setupTable(columns[OperationTypes.DoubleEndorsementEvidenceOverview]({ showFiatValue: this.isMainnet }), deData$, deLoading$)
            break
          case 'bakers':
            const bakersLoading$ = this.store$.select(state => state.list.activeBakers.loading)
            const bakersData$ = this.store$.select(state => state.list.activeBakers.data)

            this.totalActiveBakers$ = this.store$.select(state => state.list.activeBakers.pagination.total)
            this.subscriptions.push(
              refresh$.subscribe(() => {
                this.store$.dispatch(actions.loadActiveBakers())
                this.store$.dispatch(actions.loadTotalActiveBakers())
              })
            )
            this.setupTable(columns[OperationTypes.BakerOverview]({ showFiatValue: this.isMainnet }), bakersData$, bakersLoading$)
            break
          case 'proposal':
            const showLoadMore$ = this.store$
              .select(state => state.list.proposals)
              .pipe(
                map(
                  proposals =>
                    Array.isArray(proposals.data) &&
                    proposals.pagination.currentPage * proposals.pagination.selectedSize === proposals.data.length
                )
              )
            const loading$ = this.store$.select(state => state.list.proposals.loading)
            const data$ = this.store$.select(state => state.list.proposals.data)

            this.subscriptions.push(refresh$.subscribe(() => this.store$.dispatch(actions.loadProposals())))
            this.setupTable(columns[OperationTypes.ProposalOverview]({ showFiatValue: this.isMainnet }), data$, loading$, showLoadMore$)
            break
          default:
            throw new Error('unknown route')
        }
      } catch (error) {
        // tslint:disable-next-line:no-console
        console.warn(error)
      }
    })
  }

  loadMore() {
    switch (this.routeName) {
      case 'double-baking':
        this.store$.dispatch(actions.increasePageOfDoubleBakings())
        break
      case 'double-endorsement':
        this.store$.dispatch(actions.increasePageOfDoubleEndorsements())
        break
      case 'bakers':
        this.store$.dispatch(actions.increasePageOfActiveBakers())
        break
      case 'proposal':
        this.store$.dispatch(actions.increasePageOfProposals())
        break
      default:
        ;(this.dataService as any).loadMore()
    }
  }

  private setupTable(columns: Column[], data$?: Observable<Object>, loading$?: Observable<boolean>, showLoadMore$?: Observable<boolean>) {
    this.columns = columns
    this.data$ = data$ || this.dataService.list$
    this.loading$ = loading$ || this.dataService.loading$
    this.showLoadMore$ = showLoadMore$ || of(true)
  }
}
