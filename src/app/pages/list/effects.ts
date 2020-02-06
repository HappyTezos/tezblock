import { Injectable } from '@angular/core'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { of, Observable, from } from 'rxjs'
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators'
import { Store } from '@ngrx/store'
import * as moment from 'moment'

import * as listActions from './actions'
import { ApiService } from '@tezblock/services/api/api.service'
import { BaseService, Operation } from '@tezblock/services/base.service'
import { Transaction } from '@tezblock/interfaces/Transaction'
import * as fromRoot from '@tezblock/reducers'
import { getContracts } from '@tezblock/domain/contract'

const getTimestamp24hAgo = (): number =>
  moment()
    .add(-1, 'days')
    .valueOf()

const getTimestamp7dAgo = (): number =>
  moment()
    .add(-7, 'days')
    .valueOf()

@Injectable()
export class ListEffects {
  doubleBakingsPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfDoubleBakings),
      map(() => listActions.loadDoubleBakings())
    )
  )

  getDoubleBakings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadDoubleBakings),
      withLatestFrom(this.store$.select(state => state.list.doubleBakings.pagination)),
      switchMap(([action, pagination]) =>
        this.apiService.getLatestTransactions(pagination.selectedSize * pagination.currentPage, ['double_baking_evidence']).pipe(
          map((doubleBakings: Transaction[]) => listActions.loadDoubleBakingsSucceeded({ doubleBakings })),
          catchError(error => of(listActions.loadDoubleBakingsFailed({ error })))
        )
      )
    )
  )

  doubleEndorsementsPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfDoubleEndorsements),
      map(() => listActions.loadDoubleEndorsements())
    )
  )

  getDoubleEndorsements$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadDoubleEndorsements),
      withLatestFrom(this.store$.select(state => state.list.doubleEndorsements.pagination)),
      switchMap(([action, pagination]) =>
        this.apiService.getLatestTransactions(pagination.selectedSize * pagination.currentPage, ['double_endorsement_evidence']).pipe(
          map((doubleEndorsements: Transaction[]) => listActions.loadDoubleEndorsementsSucceeded({ doubleEndorsements })),
          catchError(error => of(listActions.loadDoubleEndorsementsFailed({ error })))
        )
      )
    )
  )

  proposalsPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfProposals),
      map(() => listActions.loadProposals())
    )
  )

  getProposals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadProposals),
      withLatestFrom(this.store$.select(state => state.list.proposals.pagination)),
      switchMap(([action, pagination]) =>
        this.apiService.getProposals(pagination.selectedSize * pagination.currentPage).pipe(
          map(proposals => listActions.loadProposalsSucceeded({ proposals })),
          catchError(error => of(listActions.loadProposalsFailed({ error })))
        )
      )
    )
  )

  loadActivationsCountLast24h$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadActivationsCountLast24h),
      switchMap(() =>
        this.getEntitiesSince(getTimestamp24hAgo(), 'activate_account').pipe(
          map(activations => activations.length),
          map(activationsCountLast24h => listActions.loadActivationsCountLast24hSucceeded({ activationsCountLast24h })),
          catchError(error => of(listActions.loadActivationsCountLast24hFailed({ error })))
        )
      )
    )
  )

  loadOriginationsCountLast24h$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadOriginationsCountLast24h),
      switchMap(() =>
        this.getEntitiesSince(getTimestamp24hAgo(), 'origination').pipe(
          map(originations => originations.length),
          map(originationsCountLast24h => listActions.loadOriginationsCountLast24hSucceeded({ originationsCountLast24h })),
          catchError(error => of(listActions.loadOriginationsCountLast24hFailed({ error })))
        )
      )
    )
  )

  loadTransactionsCountLast24h$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadTransactionsCountLast24h),
      switchMap(() =>
        this.getEntitiesSince(getTimestamp24hAgo(), 'transaction').pipe(
          map(transactions => transactions.length),
          map(transactionsCountLast24h => listActions.loadTransactionsCountLast24hSucceeded({ transactionsCountLast24h })),
          catchError(error => of(listActions.loadTransactionsCountLast24hFailed({ error })))
        )
      )
    )
  )

  loadActivationsCountLastXd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadActivationsCountLastXd),
      switchMap(() =>
        this.getEntitiesSince(getTimestamp7dAgo(), 'activate_account').pipe(
          map(activations => activations.map(activation => activation.timestamp)),
          map(activationsCountLastXd => listActions.loadActivationsCountLastXdSucceeded({ activationsCountLastXd })),
          catchError(error => of(listActions.loadActivationsCountLastXdFailed({ error })))
        )
      )
    )
  )

  loadOriginationsCountLastXd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadOriginationsCountLastXd),
      switchMap(() =>
        this.getEntitiesSince(getTimestamp7dAgo(), 'origination').pipe(
          map(originations => originations.map(origination => origination.timestamp)),
          map(originationsCountLastXd => listActions.loadOriginationsCountLastXdSucceeded({ originationsCountLastXd })),
          catchError(error => of(listActions.loadOriginationsCountLastXdFailed({ error })))
        )
      )
    )
  )

  loadTransactionsCountLastXd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadTransactionsCountLastXd),
      switchMap(() =>
        this.getEntitiesSince(getTimestamp7dAgo(), 'transaction').pipe(
          map(transactions => transactions.map(transaction => transaction.timestamp)),
          map(transactionsCountLastXd => listActions.loadTransactionsCountLastXdSucceeded({ transactionsCountLastXd })),
          catchError(error => of(listActions.loadTransactionsCountLastXdFailed({ error })))
        )
      )
    )
  )

  loadContracts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadContracts),
      withLatestFrom(this.store$.select(state => state.list.doubleEndorsements.pagination)),
      map(([action, pagination]) =>
        listActions.loadContractsSucceeded({ contracts: getContracts(pagination.currentPage * pagination.selectedSize) })
      )
    )
  )

  increasePageOfContracts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfContracts),
      map(() => listActions.loadContracts())
    )
  )

  private getEntitiesSince(since: number, kind: string): Observable<Transaction[]> {
    return this.baseService.post<Transaction[]>('operations', {
      fields: ['timestamp'],
      predicates: [
        { field: 'operation_group_hash', operation: Operation.isnull, inverse: true },
        { field: 'kind', operation: Operation.in, set: [kind] },
        { field: 'timestamp', operation: Operation.gt, set: [since] }
      ],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
      limit: 100000
    })
  }

  constructor(
    private readonly actions$: Actions,
    private readonly apiService: ApiService,
    private readonly baseService: BaseService,
    private readonly store$: Store<fromRoot.State>
  ) {}
}
