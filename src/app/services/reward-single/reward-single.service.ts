import { Injectable } from '@angular/core'
import { TezosProtocol, TezosRewards } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'
import { combineLatest, of } from 'rxjs'
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators'

import { distinctPagination, Facade, Pagination } from '../facade/facade'
import { ChainNetworkService } from '../chain-network/chain-network.service'

interface RewardSingleServiceState {
  rewards: any
  address: string | undefined
  pagination: Pagination
  loading: boolean
}

const initialState: RewardSingleServiceState = {
  rewards: [],
  address: '',
  pagination: {
    currentPage: 1,
    selectedSize: 3,
    pageSizes: [5, 10, 20, 50]
  },
  loading: true
}

@Injectable({
  providedIn: 'root'
})
export class RewardSingleService extends Facade<RewardSingleServiceState> {
  public rewards$ = this.state$.pipe(
    map(state => state.rewards),
    distinctUntilChanged()
  )
  public address$ = this.state$.pipe(
    map(state => state.address),
    distinctUntilChanged()
  )
  public pagination$ = this.state$.pipe(
    map(state => state.pagination),
    distinctUntilChanged(distinctPagination)
  )
  public loading$ = this.state$.pipe(map(state => state.loading))

  constructor(public readonly chainNetworkService: ChainNetworkService) {
    super(initialState)
    const environmentUrls = this.chainNetworkService.getEnvironment()
    const protocol = new TezosProtocol(environmentUrls.rpcUrl, environmentUrls.conseilUrl)

    this.subscription = combineLatest([this.pagination$, this.address$])
      .pipe(
        switchMap(async ([pagination, address]) => {
          const currentCycle = await protocol.fetchCurrentCycle()
          const rewards: TezosRewards[] = []
          // TODO fetching rewards for the current cycle takes a long time, thus we start at i=0 for now

          for (let i = 1; i < pagination.selectedSize * pagination.currentPage; i++) {
            const cycleRewards: any = await protocol.calculateRewards(address, currentCycle - i)
            cycleRewards.payouts = await protocol.calculatePayouts(cycleRewards, 0, cycleRewards.delegatedContracts.length)
            rewards.push(cycleRewards)
          }

          return rewards
        })
      )
      .subscribe(rewards => {
        this.updateState({ ...this._state, rewards, loading: false })
      })
  }

  public updateAddress(address: string) {
    this.updateState({ ...this._state, address, loading: true })
  }
  public loadMore() {
    const pagination = { ...this._state.pagination, currentPage: this._state.pagination.currentPage + 1 }
    this.updateState({ ...this._state, pagination, loading: true })
  }
}
