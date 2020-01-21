import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { merge, Observable, of, timer } from 'rxjs'
import { filter, map, switchMap } from 'rxjs/operators'
import { Store } from '@ngrx/store'
import { Actions, ofType } from '@ngrx/effects'
import { range } from 'lodash'
import * as moment from 'moment'

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

  readonly chartLabels: string[] = range(0, noOfDays).map(index =>
    moment()
      .add(-index, 'days')
      .format('DD.MM.YYYY')
  )

  private dataService

  private get routeName(): string {
    return this.route.snapshot.paramMap.get('route')
  }

  constructor(
    private readonly actions$: Actions,
    private readonly apiService: ApiService,
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

    this.route.params.subscribe(params => {
      try {
        switch (params.route) {
          case 'block':
            this.dataService = new BlockService(this.apiService)
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Block]())
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
            this.setupTable(columns[OperationTypes.Transaction]())
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
            this.setupTable(columns[OperationTypes.Activation]())
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
            this.setupTable(columns[OperationTypes.Origination]())
            break
          case 'delegation':
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['delegation'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Delegation]())
            break
          case 'endorsement':
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['endorsement'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Endorsement]())
            break
          case 'vote':
            this.dataService = new TransactionService(this.apiService)
            this.dataService.updateKind(['ballot', 'proposals'])
            this.dataService.setPageSize(10)
            this.setupTable(columns[OperationTypes.Ballot]())
            break
          case 'double-baking':
            this.subscriptions.push(refresh$.subscribe(() => this.store$.dispatch(actions.loadDoubleBakings())))
            this.loading$ = this.store$.select(state => state.list.doubleBakings.loading)
            this.data$ = this.store$.select(state => state.list.doubleBakings.data)
            this.page = 'transaction'
            this.type = 'double_baking_evidence_overview'
            break
          case 'double-endorsement':
            this.subscriptions.push(refresh$.subscribe(() => this.store$.dispatch(actions.loadDoubleEndorsements())))
            this.loading$ = this.store$.select(state => state.list.doubleEndorsements.loading)
            this.data$ = this.store$.select(state => state.list.doubleEndorsements.data)
            this.page = 'transaction'
            this.type = 'double_endorsement_evidence_overview'
            break
          case 'bakers':
            this.subscriptions.push(
              refresh$.subscribe(() => {
                this.store$.dispatch(actions.loadActiveBakers())
                this.store$.dispatch(actions.loadTotalActiveBakers())
              })
            )
            this.loading$ = this.store$.select(state => state.list.activeBakers.loading)
            this.data$ = this.store$.select(state => state.list.activeBakers.data)
            this.page = 'account'
            this.type = 'baker_overview'
            this.totalActiveBakers$ = this.store$.select(state => state.list.activeBakers.pagination.total)
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
            this.setupTable(params.route, 'ballot_overview')

            this.page = LayoutPages.Transaction
            this.type = OperationTypes.ProposalOverview
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
