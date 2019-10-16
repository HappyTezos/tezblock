import { environment } from './../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'

import { Account } from '../../interfaces/Account'
import { Block } from '../../interfaces/Block'
import { Transaction } from '../../interfaces/Transaction'
import { VotingInfo } from '../transaction-single/transaction-single.service'
import { TezosProtocol } from 'airgap-coin-lib'

const accounts = require('../../../assets/bakers/json/accounts.json')
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly blocksApiUrl = `${environment.conseilBaseUrl}/v2/data/tezos/mainnet/blocks`
  private readonly transactionsApiUrl = `${environment.conseilBaseUrl}/v2/data/tezos/mainnet/operations`
  private readonly accountsApiUrl = `${environment.conseilBaseUrl}/v2/data/tezos/mainnet/accounts`
  private readonly frozenBalanceApiUrl = `${environment.conseilBaseUrl}/v2/data/tezos/mainnet/delegates`

  private readonly options = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      apikey: environment.conseilApiKey
    })
  }

  private readonly orderByTimestampAsc = {
    field: 'timestamp',
    direction: 'asc'
  }

  private readonly orderByBlockLevelDesc = {
    field: 'block_level',
    direction: 'desc'
  }

  constructor(private readonly http: HttpClient) {}

  public getCurrentCycleRange(currentCycle: number): Observable<Block[]> {
    return this.http.post<Block[]>(
      this.blocksApiUrl,
      {
        predicates: [
          {
            field: 'meta_cycle',
            operation: 'eq',
            set: [currentCycle],
            inverse: false
          }
        ],
        orderBy: [this.orderByTimestampAsc],
        limit: 1
      },
      this.options
    )
  }

  public getLatestTransactions(limit: number, kindList: Array<string>): Observable<Transaction[]> {
    return this.http
      .post<Transaction[]>(
        this.transactionsApiUrl,
        {
          predicates: [
            {
              field: 'operation_group_hash',
              operation: 'isnull',
              inverse: true
            },
            {
              field: 'kind',
              operation: 'in',
              set: kindList
            }
          ],
          orderBy: [this.orderByBlockLevelDesc],
          limit
        },
        this.options
      )
      .pipe(
        map(transactions => {
          if (kindList.includes('ballot' || 'proposals')) {
            let source: Transaction[] = []
            source.push(...transactions)
            source.map(async transaction => {
              await this.addVotesForTransaction(transaction)
            })
            return source
          }
          return transactions
        })
      )
  }

  public getTransactionsById(id: string, limit: number): Observable<Transaction[]> {
    return this.http
      .post<Transaction[]>(
        this.transactionsApiUrl,
        {
          predicates: [
            {
              field: 'operation_group_hash',
              operation: 'eq',
              set: [id],
              inverse: false
            }
          ],
          limit
        },
        this.options
      )
      .pipe(
        map((transactions: Transaction[]) => {
          let finalTransactions: Transaction[] = []
          finalTransactions = transactions.slice(0, limit)
          const sources = []

          finalTransactions.forEach(transaction => {
            if (transaction.kind === 'delegation') {
              sources.push(transaction.source)
            }
          })

          const delegateSources = this.getAccountsByIds(sources)
          delegateSources.subscribe(delegators => {
            finalTransactions.forEach(transaction => {
              delegators.forEach(delegator => {
                if (transaction.source === delegator.account_id) {
                  transaction.delegatedBalance = delegator.balance
                }
              })
            })
          })

          return finalTransactions
        })
      )
  }

  public getTransactionsByBlock(blockHash: string, limit: number): Observable<Transaction[]> {
    return this.http.post<Transaction[]>(
      this.transactionsApiUrl,
      {
        predicates: [
          {
            field: 'operation_group_hash',
            operation: 'isnull',
            inverse: true
          },
          {
            field: 'block_hash',
            operation: 'eq',
            set: [blockHash]
          },
          {
            field: 'kind',
            operation: 'eq',
            set: ['transaction']
          }
        ],
        orderBy: [
          {
            field: 'block_level',
            direction: 'desc'
          }
        ],
        limit
      },
      this.options
    )
  }

  public getTransactionsByField(value: string, field: string, kind: string, limit: number): Observable<Transaction[]> {
    return this.http
      .post<Transaction[]>(
        this.transactionsApiUrl,
        {
          predicates: [
            {
              field: 'operation_group_hash',
              operation: 'isnull',
              inverse: true
            },
            {
              field,
              operation: 'eq',
              set: [value]
            },
            {
              field: 'kind',
              operation: 'eq',
              set: [kind]
            }
          ],
          orderBy: [
            {
              field: 'block_level',
              direction: 'desc'
            }
          ],
          limit
        },
        this.options
      )
      .pipe(
        map((transactions: Transaction[]) => {
          let finalTransactions: Transaction[] = []
          finalTransactions = transactions.slice(0, limit)
          const sources = []

          finalTransactions.forEach(transaction => {
            if (transaction.kind === 'delegation') {
              sources.push(transaction.source)
            }
          })

          const delegateSources = this.getAccountsByIds(sources)
          delegateSources.subscribe(delegators => {
            finalTransactions.forEach(transaction => {
              delegators.forEach(delegator => {
                if (transaction.source === delegator.account_id) {
                  transaction.delegatedBalance = delegator.balance
                }
              })
            })
          })

          return finalTransactions
        })
      )
  }

  public getLatestAccounts(limit: number): Observable<Account[]> {
    return this.http.post<Account[]>(
      this.accountsApiUrl,
      {
        limit
      },
      this.options
    )
  }

  public getById(id: string): Observable<Object> {
    this.getDelegatedAccounts(id, 10)

    return this.http.post(
      this.accountsApiUrl,
      {
        predicates: [
          {
            field: 'account_id',
            operation: 'eq',
            set: [id],
            inverse: false
          }
        ],
        limit: 1
      },
      this.options
    )
  }

  public getAccountById(id: string): Observable<Account[]> {
    return this.http.post<Account[]>(
      this.accountsApiUrl,
      {
        predicates: [
          {
            field: 'account_id',
            operation: 'eq',
            set: [id],
            inverse: false
          }
        ],
        limit: 1
      },
      this.options
    )
  }
  public getAccountsByIds(ids: string[]): Observable<Account[]> {
    return this.http.post<Account[]>(
      this.accountsApiUrl,
      {
        predicates: [
          {
            field: 'account_id',
            operation: 'in',
            set: ids,
            inverse: false
          }
        ]
      },
      this.options
    )
  }

  public getAccountsStartingWith(id: string): Observable<Object[]> {
    const result: Object[] = []
    Object.keys(accounts).forEach(baker => {
      if (
        accounts.hasOwnProperty(baker) &&
        accounts[baker].hasOwnProperty('alias') &&
        accounts[baker].alias.toLowerCase().startsWith(id.toLowerCase())
      ) {
        result.push({ name: accounts[baker].alias, type: 'Bakers' })
      }
    })
    if (result.length === 0) {
      return this.http
        .post<Account[]>(
          this.accountsApiUrl,
          {
            fields: ['account_id'],
            predicates: [
              {
                field: 'account_id',
                operation: 'startsWith',
                set: [id],
                inverse: false
              }
            ],
            limit: 5
          },
          this.options
        )
        .pipe(
          map(accounts =>
            accounts.map(account => {
              return { name: account.account_id, type: 'Accounts' }
            })
          )
        )
    }

    return of(result)
  }

  public getTransactionHashesStartingWith(id: string): Observable<Object[]> {
    return this.http
      .post<Transaction[]>(
        this.transactionsApiUrl,
        {
          fields: ['operation_group_hash'],
          predicates: [
            {
              field: 'operation_group_hash',
              operation: 'startsWith',
              set: [id],
              inverse: false
            }
          ],
          limit: 5
        },
        this.options
      )
      .pipe(
        map(results =>
          results.map(item => {
            return { name: item.operation_group_hash, type: 'Transactions' }
          })
        )
      )
  }

  public getBlockHashesStartingWith(id: string): Observable<Object[]> {
    return this.http
      .post<Block[]>(
        this.blocksApiUrl,
        {
          fields: ['hash'],
          predicates: [
            {
              field: 'hash',
              operation: 'startsWith',
              set: [id],
              inverse: false
            }
          ],
          limit: 5
        },
        this.options
      )
      .pipe(
        map(results =>
          results.map(item => {
            return { name: item.hash, type: 'Blocks' }
          })
        )
      )
  }

  public getDelegatedAccounts(tzAddress: string, limit: number): Observable<Account[]> {
    return this.http.post<Account[]>(
      this.accountsApiUrl,
      {
        predicates: [
          {
            field: 'manager',
            operation: 'eq',
            set: [tzAddress],
            inverse: false
          }
        ],
        orderBy: [
          {
            field: 'balance',
            direction: 'desc'
          }
        ],
        limit
      },
      this.options
    )
  }

  public getManagerAccount(ktAddress: string, limit: number): Observable<Account[]> {
    return this.http.post<Account[]>(
      this.accountsApiUrl,
      {
        predicates: [
          {
            field: 'account_id',
            operation: 'eq',
            set: [ktAddress],
            inverse: false
          }
        ],
        orderBy: [
          {
            field: 'balance',
            direction: 'desc'
          }
        ],
        limit
      },
      this.options
    )
  }

  public getAccountStatus(address: string): Promise<string> {
    return new Promise(resolve => {
      this.http
        .post<Transaction[]>(
          this.transactionsApiUrl,
          {
            predicates: [
              {
                field: 'operation_group_hash',
                operation: 'isnull',
                inverse: true
              },
              {
                field: 'kind',
                operation: 'eq',
                set: ['reveal']
              },
              {
                field: 'source',
                operation: 'eq',
                set: [address]
              }
            ],
            orderBy: [
              {
                field: 'block_level',
                direction: 'desc'
              }
            ],
            limit: 1
          },
          this.options
        )
        .subscribe(
          (transactions: Transaction[]) => {
            if (transactions.length > 0) {
              resolve('Revealed')
            } else {
              resolve('Not Revealed')
            }
          },
          err => {
            resolve('Not Available')
          }
        )
    })
  }

  public getLatestBlocks(limit: number): Observable<Block[]> {
    return this.http.post<Block[]>(
      this.blocksApiUrl,
      {
        orderBy: [
          {
            field: 'timestamp',
            direction: 'desc'
          }
        ],
        limit
      },
      this.options
    )
  }

  public getAdditionalBlockField<T>(blockRange: number[], field: string, operation: string, limit: number): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.http
        .post<T[]>(
          this.transactionsApiUrl,
          {
            fields: [field, 'block_level'],
            predicates: [
              {
                field,
                operation: 'isnull',
                inverse: true
              },
              {
                field: 'block_level',
                operation: 'in',
                set: blockRange
              }
            ],
            orderBy: [
              {
                field: 'block_level',
                direction: 'desc'
              }
            ],
            aggregation: [
              {
                field,
                function: operation
              }
            ],
            limit
          },
          this.options
        )
        .subscribe((volumePerBlock: T[]) => {
          resolve(volumePerBlock)
        })
    })
  }

  public getOperationCount(
    field: string,
    value: string
  ): Observable<{ [key: string]: string; count_operation_group_hash: string; kind: string }[]> {
    return this.http.post<{ [key: string]: string; count_operation_group_hash: string; kind: string }[]>(
      this.transactionsApiUrl,
      {
        fields: [field, 'operation_group_hash', 'kind'],
        predicates: [
          {
            field,
            operation: 'eq',
            set: [value],
            inverse: false
          }
        ],
        aggregation: [
          {
            field: 'operation_group_hash',
            function: 'count'
          }
        ]
      },
      this.options
    )
  }

  public getBlockById(id: string): Observable<Block[]> {
    return this.http.post<Block[]>(
      this.blocksApiUrl,
      {
        predicates: [
          {
            field: 'level',
            operation: 'eq',
            set: [id],
            inverse: false
          }
        ],
        limit: 1
      },
      this.options
    )
  }

  public getBlockByHash(hash: string): Observable<Block[]> {
    return this.http.post<Block[]>(
      this.blocksApiUrl,
      {
        predicates: [
          {
            field: 'hash',
            operation: 'eq',
            set: [hash],
            inverse: false
          }
        ],
        limit: 1
      },
      this.options
    )
  }

  public async addVotesForTransaction(transaction: Transaction): Promise<Transaction> {
    return new Promise(async resolve => {
      const protocol = new TezosProtocol()
      const data = await protocol.getTezosVotingInfo(transaction.block_hash)
      transaction.votes = data.find((element: VotingInfo) => element.pkh === transaction.source).rolls
      resolve(transaction)
    })
  }

  public getEndorsements(blockHash: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.http
        .post<Transaction[]>(
          this.transactionsApiUrl,
          {
            predicates: [
              {
                field: 'operation_group_hash',
                operation: 'isnull',
                inverse: true
              },
              {
                field: 'block_hash',
                operation: 'eq',
                set: [blockHash]
              },
              {
                field: 'kind',
                operation: 'eq',
                set: ['endorsement']
              }
            ],
            orderBy: [
              {
                field: 'block_level',
                direction: 'desc'
              }
            ],
            limit: 32
          },
          this.options
        )
        .subscribe((transactions: Transaction[]) => {
          resolve(transactions.length)
        })
    })
  }

  public getFrozenBalance(tzAddress: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.http
        .post(
          this.frozenBalanceApiUrl,
          {
            predicates: [
              {
                field: 'pkh',
                operation: 'eq',
                set: [tzAddress],
                inverse: false
              }
            ]
          },
          this.options
        )
        .subscribe(result => {
          resolve(result[0].frozen_balance)
        })
    })
  }
}
