export interface Account {
  block_level: number
  balance: number
  delegate_value: string
  spendable: boolean
  account_id: string
  manager: string
  storage?: any // TODO: any, both don't seem to be used
  counter: number
  block_id: string
  script?: any
  delegate_setable: boolean
  proposal: string
}
