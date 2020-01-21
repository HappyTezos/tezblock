import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TezosRewards } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'
import { combineLatest, Observable, EMPTY } from 'rxjs'
import { map, switchMap } from 'rxjs/operators'
import { Store } from '@ngrx/store'

import { BaseComponent } from '@tezblock/components/base.component'
import { Transaction } from './../../interfaces/Transaction'
import { AccountSingleService } from './../../services/account-single/account-single.service'
import { AccountService } from './../../services/account/account.service'
import { ApiService } from './../../services/api/api.service'
import { RewardSingleService } from './../../services/reward-single/reward-single.service'
import { Payout } from '@tezblock/interfaces/Payout'
import { ExpTezosRewards } from '@tezblock/services/reward/reward.service'
import { AggregatedEndorsingRights, EndorsingRights } from '@tezblock/interfaces/EndorsingRights'
import { AggregatedBakingRights, BakingRights } from '@tezblock/interfaces/BakingRights'
import { OperationTypes } from '@tezblock/components/tezblock-table/tezblock-table.component'
import * as fromRoot from '@tezblock/reducers'
import * as actions from './actions'
import { columns } from './table-definitions'
import { Column, Template, ExpandedRow } from '@tezblock/components/tezblock-table2/tezblock-table2.component'

export interface Tab {
  title: string
  active: boolean
  kind: string
  icon?: string[]
  count: number
}

@Component({
  selector: 'baker-table',
  templateUrl: './baker-table.component.html',
  styleUrls: ['./baker-table.component.scss'],
  providers: [AccountSingleService, RewardSingleService]
})
export class BakerTableComponent extends BaseComponent implements OnInit {
  @ViewChild('expandedRowTemplate', { static: true }) expandedRowTemplate: TemplateRef<any>
  private _tabs: Tab[] | undefined = []
  selectedTab: Tab | undefined = undefined
  transactions$: Observable<Transaction[]>

  bakingBadRating: string | undefined
  tezosBakerRating: string | undefined
  stakingBalance: number | undefined
  numberOfRolls: number | undefined
  payoutAddress: string | undefined

  bakingInfos: any
  stakingCapacity: number | undefined
  stakingProgress: number | undefined
  stakingBond: number | undefined

  isValidBaker: boolean | undefined
  rewardsLoading$: Observable<boolean>
  rightsLoading$: Observable<boolean>
  accountLoading$: Observable<boolean>

  rewards$: Observable<TezosRewards[]>
  rights$: Observable<(AggregatedBakingRights | AggregatedEndorsingRights)[]>

  efficiencyLast10Cycles$: Observable<number>
  efficiencyLast10CyclesLoading$: Observable<boolean>

  rewards: TezosRewards

  activeDelegations$: Observable<number>

  frozenBalance: number | undefined
  rewardsExpandedRow: ExpandedRow<ExpTezosRewards>

  get rightsExpandedRow(): ExpandedRow<AggregatedBakingRights> | ExpandedRow<AggregatedEndorsingRights> {
    return this.selectedTab.kind === OperationTypes.BakingRights ? this.bakingRightsExpandedRow : this.endorsingRightsExpandedRow
  }

  get accountAddress(): string {
    return this.route.snapshot.paramMap.get('id')
  }

  @Input()
  page: string = 'account'

  @Input()
  set tabs(tabs: Tab[]) {
    this._tabs = tabs

    if (!this.selectedTab) {
      this.updateSelectedTab(tabs[0])
    }

    this.getTabCount(tabs)
  }

  get tabs() {
    if (this._tabs) {
      return this._tabs
    } else {
      return []
    }
  }

  @Input()
  set data(bakerTableInfos: any) {
    if (bakerTableInfos) {
      this.stakingBalance = bakerTableInfos.stakingBalance
      this.stakingCapacity = bakerTableInfos.stakingCapacity
      this.stakingProgress = bakerTableInfos.stakingProgress
      this.stakingBond = bakerTableInfos.stakingBond
      this.frozenBalance = bakerTableInfos.frozenBalance
      this.numberOfRolls = bakerTableInfos.numberOfRolls
      this.payoutAddress = bakerTableInfos.payoutAddress
    }
  }

  @Input()
  set ratings(bakerTableRatings: any) {
    if (bakerTableRatings) {
      this.tezosBakerRating = bakerTableRatings.tezosBakerRating
      this.bakingBadRating = bakerTableRatings.bakingBadRating
    }
  }

  @Output()
  readonly overviewTabClicked: EventEmitter<string> = new EventEmitter()

  rewardsColumns: Column[]
  rewardsFields: string[]

  get rightsColumns(): Column[] {
    return this.selectedTab.kind === OperationTypes.BakingRights ? this.bakingRightsColumns : this.endorsingRightsColumns
  }

  get rightsFields(): string[] {
    return this.selectedTab.kind === OperationTypes.BakingRights ? this.bakingRightsFields : this.endorsingRightsFields
  }

  private bakingRightsColumns: Column[]
  private bakingRightsFields: string[]
  private endorsingRightsColumns: Column[]
  private endorsingRightsFields: string[]
  private bakingRightsExpandedRow: ExpandedRow<AggregatedBakingRights>
  private endorsingRightsExpandedRow: ExpandedRow<AggregatedEndorsingRights>

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly accountService: AccountService,
    private readonly accountSingleService: AccountSingleService,
    private readonly rewardSingleService: RewardSingleService,
    private readonly apiService: ApiService,
    private readonly store$: Store<fromRoot.State>
  ) {
    super()

    this.store$.dispatch(actions.reset())

    this.subscriptions.push(
      this.route.paramMap.subscribe(async paramMap => {
        const accountAddress = paramMap.get('id')
        this.store$.dispatch(actions.setAccountAddress({ accountAddress }))
        this.store$.dispatch(actions.loadCurrentCycleThenRights())
        this.store$.dispatch(actions.loadEfficiencyLast10Cycles())
        this.rewardSingleService.updateAddress(accountAddress)
        this.accountSingleService.setAddress(accountAddress)
        this.frozenBalance = await this.accountService.getFrozen(accountAddress)
      })
    )
  }

  async ngOnInit() {
    this.rights$ = this.store$
      .select(state => state.bakerTable.kind)
      .pipe(
        switchMap(kind => {
          if (kind === OperationTypes.BakingRights) {
            return this.store$.select(state => state.bakerTable.bakingRights).pipe(map(table => table.data))
          }

          if (kind === OperationTypes.EndorsingRights) {
            return this.store$.select(state => state.bakerTable.endorsingRights).pipe(map(table => table.data))
          }

          return EMPTY
        })
      )
    this.rewards$ = this.rewardSingleService.rewards$
    this.rightsLoading$ = combineLatest(
      this.store$.select(state => state.bakerTable.bakingRights.loading),
      this.store$.select(state => state.bakerTable.endorsingRights.loading)
    ).pipe(map(([bakingRightsLoading, endorsingRightsLoading]) => bakingRightsLoading || endorsingRightsLoading))
    this.rewardsLoading$ = this.rewardSingleService.loading$
    this.accountLoading$ = this.accountSingleService.loading$
    this.activeDelegations$ = this.accountSingleService.activeDelegations$
    this.efficiencyLast10Cycles$ = this.store$.select(state => state.bakerTable.efficiencyLast10Cycles)
    this.efficiencyLast10CyclesLoading$ = this.store$.select(state => state.bakerTable.busy.efficiencyLast10Cycles)

    this.setupExpandedRows()
    this.setupTables()
  }

  selectTab(selectedTab: Tab) {
    this.store$.dispatch(actions.kindChanged({ kind: selectedTab.kind }))
    this.updateSelectedTab(selectedTab)
    this.overviewTabClicked.emit(selectedTab.kind)
  }

  getTabCount(tabs: Tab[]) {
    let ownId: string = this.router.url
    const split = ownId.split('/')
    ownId = split.slice(-1).pop()

    const aggregateFunction = info => {
      let tab = tabs.find(tabArgument => tabArgument.kind === info.kind)
      if (info.kind === 'proposals') {
        tab = tabs.find(tabArgument => tabArgument.kind === 'ballot')
      }
      if (tab) {
        const count = parseInt(info.count_operation_group_hash, 10)
        tab.count = tab.count ? tab.count + count : count
      }
    }

    const setFirstActiveTab = () => {
      const firstActiveTab = this.tabs.find(tab => tab.count > 0)
      if (firstActiveTab) {
        this.selectTab(firstActiveTab)
      }
    }

    if (this.page === 'transaction') {
      const transactionPromise = this.apiService.getOperationCount('operation_group_hash', ownId).toPromise()

      transactionPromise
        .then(transactionCounts => {
          transactionCounts.forEach(aggregateFunction)

          setFirstActiveTab()
        })
        .catch(console.error)
    }
  }

  loadMoreRights(): void {
    this.store$.dispatch(actions.increaseRightsPageSize())
  }

  loadMoreRewards(): void {
    this.rewardSingleService.loadMore()
  }

  private updateSelectedTab(selectedTab: Tab) {
    this.tabs.forEach(tab => (tab.active = tab === selectedTab))
    this.selectedTab = selectedTab
  }

  private setupTables() {
    this.bakingRightsColumns = columns[OperationTypes.BakingRights]()
    this.bakingRightsFields = this.bakingRightsColumns.map(column => column.field)

    this.endorsingRightsColumns = columns[OperationTypes.EndorsingRights]()
    this.endorsingRightsFields = this.endorsingRightsColumns.map(column => column.field)

    this.rewardsColumns = columns[OperationTypes.Rewards]()
    this.rewardsFields = this.rewardsColumns.map(column => column.field)
  }

  private setupExpandedRows() {
    this.rewardsExpandedRow = {
      template: this.expandedRowTemplate,
      getContext: (item: ExpTezosRewards) => ({
        columns: [
          {
            name: 'Delegator Account',
            field: 'delegator',
            template: Template.address,
            data: (item: Payout) => ({ data: item.delegator, options: { showFiatValue: true } })
          },
          {
            name: 'Payout',
            field: 'payout',
            template: Template.amount,
            data: (item: Payout) => ({ data: item.payout, options: { showFiatValue: true } })
          },
          { name: 'Share', field: 'share', template: Template.percentage }
        ],
        data: item.payouts,
        filterCondition: (detail, query) => detail.delegator === query
      }),
      primaryKey: 'cycle'
    }

    this.bakingRightsExpandedRow = {
      template: this.expandedRowTemplate,
      getContext: (item: AggregatedBakingRights) => ({
        columns: [
          { name: 'Cycle', field: 'cycle' },
          { name: 'Age', field: 'estimated_time', template: Template.timestamp },
          { name: 'Level', field: 'level', template: Template.block },
          { name: 'Priority', field: 'priority' },
          { name: 'Rewards', field: 'rewards' },
          { name: 'Fees', field: null, template: Template.amount },
          { name: 'Deposits', field: null, template: Template.amount }
        ],
        data: item.items,
        filterCondition: (detail, query) => detail.block_hash === query
      }),
      primaryKey: 'cycle'
    }

    this.endorsingRightsExpandedRow = {
      template: this.expandedRowTemplate,
      getContext: (item: AggregatedEndorsingRights) => ({
        columns: [
          { name: 'Cycle', field: 'cycle' },
          { name: 'Age', field: 'estimated_time', template: Template.timestamp },
          { name: 'Level', field: 'level', template: Template.block },
          { name: 'Slot', field: 'slot' },
          {
            name: 'Rewards',
            field: 'rewards',
            template: Template.amount,
            data: (item: EndorsingRights) => ({ data: item.rewards, options: { showFiatValue: true } })
          },
          { name: 'Deposits', field: null, template: Template.amount }
        ],
        data: item.items,
        filterCondition: (detail, query) => detail.block_hash === query
      }),
      primaryKey: 'cycle'
    }
  }
}
