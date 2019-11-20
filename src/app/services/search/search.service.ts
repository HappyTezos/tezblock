import { Block } from './../../interfaces/Block'
import { TransactionSingleService } from './../transaction-single/transaction-single.service'
import { ApiService } from './../api/api.service'
import { AccountSingleService } from './../account-single/account-single.service'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'

import { BlockService } from '../blocks/blocks.service'
import { BlockSingleService } from '../block-single/block-single.service'
import { Observable, Subject, Subscription } from 'rxjs'

const accounts = require('../../../assets/bakers/json/accounts.json')

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(private readonly blockService: BlockService, private readonly apiService: ApiService, private readonly router: Router) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false
  }

  // TODO: Very hacky, we need to do that better once we know if we build our own API endpoint or conseil will add something.
  public search(searchTerm: string): Observable<boolean> {
    const subscriptions: Subscription[] = []
    const unsubscribe = () => subscriptions.forEach(subscription => subscription.unsubscribe())
    const trimmedSearchTerm = searchTerm.trim()
    const result = new Subject<boolean>()

    // if we typed in an alias, we should convert this into an address
    const getAllies = (term: string) => Object.keys(accounts).find(account => accounts[account].alias === term)

    const _searchTerm = getAllies(trimmedSearchTerm) || trimmedSearchTerm

    let found = false
    let counter = 0

    const processResult = (data: Array<any>, callback: Function): boolean => {
      if (found) {
        return false
      }

      counter++

      if (data.length > 0) {
        found = true
        callback(data)
        result.next(true)
        result.complete()
        unsubscribe()

        return true
      }

      if (counter === 7) {
        result.next(false)
        result.complete()
        unsubscribe()
        alert('No results found!')
      }

      return false
    }

    const accountSingleService = new AccountSingleService(this.apiService)
    const account$ = accountSingleService.account$
    accountSingleService.setAddress(_searchTerm)

    const transactionSingleService = new TransactionSingleService(this.apiService)
    const transactions$ = transactionSingleService.transactions$
    transactionSingleService.updateTransactionHash(_searchTerm)

    const blockSingleService = new BlockSingleService(this.blockService)
    const blocks$: Observable<Block[]> = blockSingleService.block$
    blockSingleService.updateHash(_searchTerm)

    subscriptions.push(
      account$.subscribe(account => {
        if (account) {
          processResult([account], () => {
            this.router.navigateByUrl('/account/' + _searchTerm)
          })
        }
      }),
      transactions$.subscribe(transactions => {
        if (transactions) {
          processResult(transactions, () => {
            this.router.navigateByUrl('/transaction/' + _searchTerm)
          })
        }
      }),
      blocks$.subscribe(blocks => {
        if (blocks) {
          processResult(blocks, () => {
            this.router.navigateByUrl('/block/' + blocks[0].level)
          })
        }
      })
    )

    return result
  }
}
