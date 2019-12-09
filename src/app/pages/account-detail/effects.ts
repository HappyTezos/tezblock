import { Injectable } from '@angular/core'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { of, merge, timer } from 'rxjs'
import { map, catchError, delay, switchMap, withLatestFrom } from 'rxjs/operators'
import { Store } from '@ngrx/store'

import { NewTransactionService } from '@tezblock/services/transaction/new-transaction.service'
import * as actions from './actions'
import { RewardService } from '@tezblock/services/reward/reward.service'
import { ApiService } from '@tezblock/services/api/api.service'
import { NewAccountService } from '@tezblock/services/account/account.service'
import { first } from '@tezblock/services/fp'
import * as fromRoot from '@tezblock/reducers'
import { refreshRate } from '@tezblock/services/facade/facade'

@Injectable()
export class AccountDetailEffects {
  getAccountRefresh$ = createEffect(() =>
    merge(this.actions$.pipe(ofType(actions.loadAccountSucceeded)), this.actions$.pipe(ofType(actions.loadAccountFailed))).pipe(
      delay(refreshRate),
      withLatestFrom(this.store$.select(state => state.accountDetails.address)),
      map(([action, address]) => actions.loadAccount({ address }))
    )
  )

  getAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadAccount),
      switchMap(({ address }) =>
        this.apiService.getAccountById(address).pipe(
          map(accounts => actions.loadAccountSucceeded({ account: first(accounts) })),
          catchError(error => of(actions.loadAccountFailed({ error })))
        )
      )
    )
  )

  getDelegatedAccounts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadAccount),
      switchMap(({ address }) =>
        this.accountService.getDelegatedAccounts(address).pipe(
          map(accounts => actions.loadDelegatedAccountsSucceeded({ accounts })),
          catchError(error => of(actions.loadDelegatedAccountsFailed({ error })))
        )
      )
    )
  )

  getRewardAmont$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadRewardAmont),
      switchMap(action =>
        this.rewardService.getRewardAmont(action.accountAddress, action.bakerAddress).pipe(
          map(rewardAmont => actions.loadRewardAmontSucceeded({ rewardAmont })),
          catchError(error => of(actions.loadRewardAmontFailed({ error })))
        )
      )
    )
  )

  getTransactionsRefresh$ = createEffect(() =>
    merge(
      this.actions$.pipe(ofType(actions.loadTransactionsByKindSucceeded)),
      this.actions$.pipe(ofType(actions.loadTransactionsByKindFailed))
    ).pipe(
      withLatestFrom(this.store$.select(state => state.accountDetails.kind)),
      switchMap(([action, kind]) =>
        timer(refreshRate, refreshRate).pipe(map(() => actions.loadTransactionsByKind({ kind })))
      )
    )
  )

  getTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadTransactionsByKind),
      withLatestFrom(
        this.store$.select(state => state.accountDetails.pageSize),
        this.store$.select(state => state.accountDetails.address)),
      switchMap(([{ kind }, pageSize, address]) =>
        this.transactionService.getAllTransactionsByAddress(address, kind, pageSize).pipe(
          map(data => actions.loadTransactionsByKindSucceeded({ data })),
          catchError(error => of(actions.loadTransactionsByKindFailed({ error })))
        )
      )
    )
  )

  onPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.increasePageSize),
      withLatestFrom(this.store$.select(state => state.accountDetails.kind)),
      map(([action, kind]) => actions.loadTransactionsByKind({ kind }))
    )
  )

  constructor(
    private readonly accountService: NewAccountService,
    private readonly actions$: Actions,
    private readonly apiService: ApiService,
    private readonly rewardService: RewardService,
    private readonly store$: Store<fromRoot.State>,
    private readonly transactionService: NewTransactionService
  ) {}
}
