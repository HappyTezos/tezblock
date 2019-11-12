import { createReducer, on } from '@ngrx/store'
import * as _ from 'lodash'

import * as Actions from './actions'
import { Transaction } from '@tezblock/interfaces/Transaction'

interface ParsedTransaction extends Transaction {
  parsedSlots: number[]
}

type StotState = 'selected' | 'not_selected' | 'empty'

export interface Slot {
  index: number
  operation_group_hash: string
  endorser: string
  state: StotState
}

const toParsedEndorsement = (endorsement: Transaction): ParsedTransaction => ({
  ...endorsement,
  parsedSlots: JSON.parse(endorsement.slots)
})

const getSlots = (endorsements: ParsedTransaction[], selectedEndorsementId: string): Slot[] => {
  const maxSlotNo = Math.max(..._.flatten(endorsements.map(endorsement => endorsement.parsedSlots)))

  return _.range(1, maxSlotNo).map(index => {
    const endorsement = _.find(endorsements, endorsementItem => endorsementItem.parsedSlots.indexOf(index) !== -1)

    return <Slot>{
      index,
      operation_group_hash: endorsement ? endorsement.operation_group_hash : null,
      endorser: endorsement ? endorsement.branch : null,
      state: endorsement ? (endorsement.operation_group_hash === selectedEndorsementId ? 'selected' : 'not_selected') : 'empty'
    }
  })
}

export interface State {
  endorsements: ParsedTransaction[]
  selectedEndorsement: Transaction
  slots: Slot[]
}

const initialState: State = {
  endorsements: undefined,
  selectedEndorsement: undefined,
  slots: undefined
}

export const reducer = createReducer(
  initialState,
  on(Actions.loadEndorsementsSucceeded, (state, { endorsements }) => {
    const newEndorsements = endorsements.map(toParsedEndorsement)

    return {
      ...state,
      endorsements: newEndorsements,
      slots: getSlots(newEndorsements, state.selectedEndorsement.operation_group_hash)
    }
  }),
  on(Actions.loadEndorsementDetailsSucceeded, (state, { endorsement }) => ({
    ...state,
    selectedEndorsement: endorsement
  })),
  on(Actions.slotSelected, (state, { operation_group_hash }) => ({
    ...state,
    selectedEndorsement: _.find(state.endorsements, endorsement => endorsement.operation_group_hash === operation_group_hash),
    slots: getSlots(state.endorsements, operation_group_hash)
  }))
)

export const getEndorsements = (state: State) => state.endorsements
export const getSelectedEndorsement = (state: State) => state.selectedEndorsement
