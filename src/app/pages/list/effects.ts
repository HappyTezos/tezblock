import { Injectable } from '@angular/core'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { of, Observable } from 'rxjs'
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators'
import { Store } from '@ngrx/store'
import * as moment from 'moment'

import * as listActions from './actions'
import { ApiService } from '@tezblock/services/api/api.service'
import { BlockService } from '@tezblock/services/blocks/blocks.service'
import { BaseService, Operation } from '@tezblock/services/base.service'
import { Transaction } from '@tezblock/interfaces/Transaction'
import * as fromRoot from '@tezblock/reducers'
import { Block } from '@tezblock/interfaces/Block'
import { OperationTypes } from '@tezblock/domain/operations'

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
  blocksPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfBlocks),
      map(() => listActions.loadBlocks())
    )
  )

  onSortingBlocks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.sortBlocksByKind),
      map(() => listActions.loadBlocks())
    )
  )

  getBlocks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadBlocks),
      withLatestFrom(
        this.store$.select(state => state.list.blocks.pagination),
        this.store$.select(state => state.list.blocks.sortingValue),
        this.store$.select(state => state.list.blocks.sortingDirection)
      ),
      switchMap(([action, pagination, sortingValue, sortingDirection]) => {
        return this.apiService.getLatestBlocks(pagination.currentPage * pagination.selectedSize).pipe(
          map((blocks: Block[]) => {
            return listActions.loadAdditionalBlockData({ blocks })
          }),
          catchError(error => of(listActions.loadBlocksFailed({ error })))
        )
      })
    )
  )
  getAdditonalBlockData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadAdditionalBlockData),
      withLatestFrom(this.store$.select(state => state.list.blocks.pagination), this.store$.select(state => state.list.blocks.data)),
      switchMap(([action, pagination, data]) => {
        console.log('data: ', data)
        const promise = this.blockService.getAdditionalBlockData(data, pagination.currentPage * pagination.selectedSize)

        const additionalData = of(promise)
        return this.apiService.getLatestBlocks(pagination.currentPage * pagination.selectedSize).pipe(
          map((blocks: Block[]) => {
            // const promise = this.blockService.getAdditionalBlockData(blocks, pagination.currentPage * pagination.selectedSize)

            return listActions.loadAdditionalBlockDataSucceeded({ blocks })
          }),
          catchError(error => of(listActions.loadAdditionalBlockDataFailed({ error })))
        )
      })
    )
  )

  transactionsPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfTransactions),
      map(() => listActions.loadTransactions())
    )
  )

  onSortingTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.sortTransactionsByKind),
      map(() => listActions.loadTransactions())
    )
  )

  getTransactions = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadTransactions),
      withLatestFrom(
        this.store$.select(state => state.list.transactions.pagination),
        this.store$.select(state => state.list.transactions.sortingValue),
        this.store$.select(state => state.list.transactions.sortingDirection)
      ),
      switchMap(([action, pagination, sortingValue, sortingDirection]) => {
        if (!sortingValue) {
          return this.apiService.getLatestTransactions(pagination.selectedSize * pagination.currentPage, [OperationTypes.Transaction]).pipe(
            map((transactions: Transaction[]) => listActions.loadTransactionsSucceeded({ transactions })),
            catchError(error => of(listActions.loadTransactionsFailed({ error })))
          )
        } else {
          if (!sortingDirection) {
            return this.apiService
              .getLatestTransactions(pagination.selectedSize * pagination.currentPage, [OperationTypes.Transaction])
              .pipe(
                map((transactions: Transaction[]) => listActions.loadTransactionsSucceeded({ transactions })),
                catchError(error => of(listActions.loadTransactionsFailed({ error })))
              )
          } else {
            return this.apiService
              .getLatestTransactions(
                pagination.selectedSize * pagination.currentPage,
                [OperationTypes.Transaction],
                sortingValue,
                sortingDirection
              )
              .pipe(
                map((transactions: Transaction[]) => listActions.loadTransactionsSucceeded({ transactions })),
                catchError(error => of(listActions.loadTransactionsFailed({ error })))
              )
          }
        }
      })
    )
  )

  activationsPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfActivations),
      map(() => listActions.loadActivations())
    )
  )

  onSortingActivations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.sortActivationsByKind),
      map(() => listActions.loadActivations())
    )
  )

  getActivations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadActivations),
      withLatestFrom(
        this.store$.select(state => state.list.activations.pagination),
        this.store$.select(state => state.list.activations.sortingValue),
        this.store$.select(state => state.list.activations.sortingDirection)
      ),
      switchMap(([action, pagination, sortingValue, sortingDirection]) => {
        if (!sortingValue) {
          return this.apiService.getLatestTransactions(pagination.selectedSize * pagination.currentPage, [OperationTypes.Activation]).pipe(
            map((transactions: Transaction[]) => listActions.loadActivationsSucceeded({ transactions })),
            catchError(error => of(listActions.loadActivationsFailed({ error })))
          )
        } else {
          if (!sortingDirection) {
            return this.apiService
              .getLatestTransactions(pagination.selectedSize * pagination.currentPage, [OperationTypes.Activation])
              .pipe(
                map((transactions: Transaction[]) => listActions.loadActivationsSucceeded({ transactions })),
                catchError(error => of(listActions.loadActivationsFailed({ error })))
              )
          } else {
            return this.apiService
              .getLatestTransactions(
                pagination.selectedSize * pagination.currentPage,
                [OperationTypes.Activation],
                sortingValue,
                sortingDirection
              )
              .pipe(
                map((transactions: Transaction[]) => listActions.loadActivationsSucceeded({ transactions })),
                catchError(error => of(listActions.loadActivationsFailed({ error })))
              )
          }
        }
      })
    )
  )

  doubleBakingsPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfDoubleBakings),
      map(() => listActions.loadDoubleBakings())
    )
  )

  onSortingDoubleBakings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.sortDoubleBakingsByKind),
      map(() => listActions.loadDoubleBakings())
    )
  )

  getDoubleBakings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadDoubleBakings),
      withLatestFrom(
        this.store$.select(state => state.list.doubleBakings.pagination),
        this.store$.select(state => state.list.doubleBakings.sortingValue),
        this.store$.select(state => state.list.doubleBakings.sortingDirection)
      ),
      switchMap(([action, pagination, sortingValue, sortingDirection]) => {
        if (!sortingValue) {
          return this.apiService.getLatestTransactions(pagination.selectedSize * pagination.currentPage, ['double_baking_evidence']).pipe(
            map((doubleBakings: Transaction[]) => listActions.loadDoubleBakingsSucceeded({ doubleBakings })),
            catchError(error => of(listActions.loadDoubleBakingsFailed({ error })))
          )
        } else {
          if (!sortingDirection) {
            return this.apiService.getLatestTransactions(pagination.selectedSize * pagination.currentPage, ['double_baking_evidence']).pipe(
              map((doubleBakings: Transaction[]) => listActions.loadDoubleBakingsSucceeded({ doubleBakings })),
              catchError(error => of(listActions.loadDoubleBakingsFailed({ error })))
            )
          } else {
            return this.apiService
              .getLatestTransactions(
                pagination.selectedSize * pagination.currentPage,
                ['double_baking_evidence'],
                sortingValue,
                sortingDirection
              )
              .pipe(
                map((doubleBakings: Transaction[]) => listActions.loadDoubleBakingsSucceeded({ doubleBakings })),
                catchError(error => of(listActions.loadDoubleBakingsFailed({ error })))
              )
          }
        }
      })
    )
  )

  doubleEndorsementsPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfDoubleEndorsements),
      map(() => listActions.loadDoubleEndorsements())
    )
  )

  onSortingDoubleEndorsements$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.sortDoubleEndorsementsByKind),
      map(() => listActions.loadDoubleEndorsements())
    )
  )

  getDoubleEndorsements$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadDoubleEndorsements),
      withLatestFrom(
        this.store$.select(state => state.list.doubleEndorsements.pagination),
        this.store$.select(state => state.list.doubleEndorsements.sortingValue),
        this.store$.select(state => state.list.doubleEndorsements.sortingDirection)
      ),
      switchMap(([action, pagination, sortingValue, sortingDirection]) => {
        if (!sortingValue) {
          return this.apiService
            .getLatestTransactions(pagination.selectedSize * pagination.currentPage, ['double_endorsement_evidence'])
            .pipe(
              map((doubleEndorsements: Transaction[]) => listActions.loadDoubleEndorsementsSucceeded({ doubleEndorsements })),
              catchError(error => of(listActions.loadDoubleEndorsementsFailed({ error })))
            )
        } else {
          if (!sortingDirection) {
            return this.apiService
              .getLatestTransactions(pagination.selectedSize * pagination.currentPage, ['double_endorsement_evidence'])
              .pipe(
                map((doubleEndorsements: Transaction[]) => listActions.loadDoubleEndorsementsSucceeded({ doubleEndorsements })),
                catchError(error => of(listActions.loadDoubleEndorsementsFailed({ error })))
              )
          } else {
            return this.apiService
              .getLatestTransactions(
                pagination.selectedSize * pagination.currentPage,
                ['double_baking_evidence'],
                sortingValue,
                sortingDirection
              )
              .pipe(
                map((doubleEndorsements: Transaction[]) => listActions.loadDoubleEndorsementsSucceeded({ doubleEndorsements })),
                catchError(error => of(listActions.loadDoubleEndorsementsFailed({ error })))
              )
          }
        }
      })
    )
  )

  activeBakersPaging$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.increasePageOfActiveBakers),
      map(() => listActions.loadActiveBakers())
    )
  )

  getActiveBakers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadActiveBakers),
      withLatestFrom(this.store$.select(state => state.list.activeBakers.pagination)),
      switchMap(([action, pagination]) =>
        this.apiService.getActiveBakers(pagination.selectedSize * pagination.currentPage).pipe(
          switchMap(activeBakers =>
            this.apiService.getNumberOfDelegatorsByBakers(activeBakers.map(activeBaker => activeBaker.pkh)).pipe(
              map(numberOfDelegatorsByBakers =>
                listActions.loadActiveBakersSucceeded({
                  activeBakers: activeBakers.map(activeBaker => {
                    const match = numberOfDelegatorsByBakers.find(item => item.delegate_value == activeBaker.pkh)
                    const number_of_delegators = match ? match.number_of_delegators : null

                    return {
                      ...activeBaker,
                      number_of_delegators
                    }
                  })
                })
              ),
              catchError(error => of(listActions.loadActiveBakersFailed({ error })))
            )
          )
        )
      )
    )
  )

  getTotalActiveBakers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(listActions.loadTotalActiveBakers),
      switchMap(() =>
        this.apiService.getTotalBakersAtTheLatestBlock().pipe(
          map(totalActiveBakers => listActions.loadTotalActiveBakersSucceeded({ totalActiveBakers })),
          catchError(error => of(listActions.loadTotalActiveBakersFailed({ error })))
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
    private readonly store$: Store<fromRoot.State>,
    private readonly blockService: BlockService
  ) {}
}
