import { createReducer, on } from '@ngrx/store'
import { range } from 'lodash'

import * as actions from './actions'
import { Pagination } from '@tezblock/services/facade/facade'
import { AggregatedBakingRights } from '@tezblock/interfaces/BakingRights'
import { AggregatedEndorsingRights } from '@tezblock/interfaces/EndorsingRights'
import { OperationTypes } from '@tezblock/components/tezblock-table/tezblock-table.component'

interface TableState<T> {
  data: T[]
  pagination: Pagination
  loading: boolean
}

const getInitialTableState = (): TableState<any> => ({
  data: undefined,
  pagination: {
    currentPage: 1,
    selectedSize: 5
  },
  loading: false
})

export interface State {
  accountAddress: string
  currentCycle: number
  bakingRights: TableState<AggregatedBakingRights>
  endorsingRights: TableState<AggregatedEndorsingRights>
  kind: string
}

const initialState: State = {
  accountAddress: undefined,
  currentCycle: undefined,
  bakingRights: getInitialTableState(),
  endorsingRights: getInitialTableState(),
  kind: undefined
}

const bakingRightsFactory = (cycle: number): AggregatedBakingRights => ({
  cycle: cycle,
  bakingsCount: 0,
  blockRewards: null,
  deposits: null,
  fees: null,
  items: []
})

const endorsingRightsFactory = (cycle: number): AggregatedEndorsingRights => ({
  cycle: cycle,
  endorsementsCount: 0,
  endorsementRewards: null,
  deposits: null,
  items: []
})

const fillMissingCycles = (currentCycle: number, rights: { cycle: number }[], paging: Pagination, rightFactory: (cycle: number) => any) => {
  const count = paging.currentPage * paging.selectedSize

  return range(currentCycle - count, currentCycle)
    .map(cycle => {
      const match = rights.find(right => right.cycle === cycle)

      return match || rightFactory(cycle)
    })
    .sort((a, b) => b.cycle - a.cycle)
}

export const reducer = createReducer(
  initialState,
  on(actions.setAccountAddress, (state, { accountAddress }) => ({
    ...state,
    accountAddress
  })),
  on(actions.loadCurrentCycleThenRightsSucceeded, (state, { currentCycle }) => ({
    ...state,
    currentCycle
  })),
  on(actions.loadBakingRights, state => ({
    ...state,
    bakingRights: {
      ...state.bakingRights,
      loading: true
    }
  })),
  on(actions.loadBakingRightsSucceeded, (state, { bakingRights }) => ({
    ...state,
    bakingRights: {
      ...state.bakingRights,
      data: bakingRights,
      loading: false
    }
  })),
  on(actions.loadBakingRightsFailed, state => ({
    ...state,
    bakingRights: {
      ...state.bakingRights,
      loading: false
    }
  })),
  on(actions.loadEndorsingRights, state => ({
    ...state,
    endorsingRights: {
      ...state.endorsingRights,
      loading: true
    }
  })),
  on(actions.loadEndorsingRightsSucceeded, (state, { endorsingRights }) => ({
    ...state,
    endorsingRights: {
      ...state.endorsingRights,
      data: endorsingRights,
      loading: false
    }
  })),
  on(actions.loadEndorsingRightsFailed, state => ({
    ...state,
    endorsingRights: {
      ...state.endorsingRights,
      loading: false
    }
  })),
  on(actions.increaseRightsPageSize, state => ({
    ...state,
    endorsingRights:
      state.kind === OperationTypes.EndorsingRights
        ? {
            ...state.endorsingRights,
            pagination: {
              ...state.endorsingRights.pagination,
              currentPage: state.endorsingRights.pagination.currentPage + 1
            }
          }
        : state.endorsingRights,
    bakingRights:
      state.kind === OperationTypes.BakingRights
        ? {
            ...state.bakingRights,
            pagination: {
              ...state.bakingRights.pagination,
              currentPage: state.bakingRights.pagination.currentPage + 1
            }
          }
        : state.bakingRights
  })),
  on(actions.kindChanged, (state, { kind }) => ({
    ...state,
    kind
  })),
  on(actions.reset, () => initialState)
)
