import { Observable, ReplaySubject, timer } from 'rxjs'

export interface Pagination {
  selectedSize: number
  currentPage: number
  pageSizes: number[]
}

export class Facade<T> {
  protected _state: T
  private readonly store: ReplaySubject<T> = new ReplaySubject<T>(1)
  protected readonly state$: Observable<T> = this.store.asObservable()

  protected timer$ = timer(0, 30000)

  constructor(state: T) {
    this.store.next((this._state = state))
  }

  protected updateState(state: T) {
    this.store.next((this._state = state))
  }
}

export function distinctTransactionArray(previous, current): boolean {
  if (previous.length !== current.length) {
    return false
  }
  for (let i = 0; i < previous.length; i++) {
    if (previous[i].operation_group_hash !== current[i].operation_group_hash) {
      return false
    }
  }

  return true
}

export function distinctPagination(previous: Pagination, current: Pagination): boolean {
  return !(
    previous.currentPage !== current.currentPage ||
    previous.pageSizes !== current.pageSizes ||
    previous.selectedSize !== current.selectedSize
  )
}
