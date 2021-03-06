import { Component, Input, ElementRef } from '@angular/core'
import { Router } from '@angular/router'
import { Observable, Subscription } from 'rxjs'
import { ChainNetworkService } from 'src/app/services/chain-network/chain-network.service'
import { CycleService } from 'src/app/services/cycle/cycle.service'
import { TezosNetwork } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { map } from 'rxjs/operators'

@Component({
  selector: 'header-item',
  templateUrl: './header-item.component.html',
  styleUrls: ['./header-item.component.scss']
})
export class HeaderItemComponent {
  @Input()
  public isMinimized: boolean = false

  @Input()
  public activeLinkBlockchain: boolean = false

  @Input()
  public activeLinkResources: boolean = false

  public subscription: Subscription

  public currentCycle: Observable<number>
  public cycleProgress: Observable<number>
  public remainingTime: Observable<string>
  public triggers: string = ''
  public title = 'tezblock'
  public isCollapsed = true
  public hideDropdown = true
  public selectedNetwork: TezosNetwork
  public networks = TezosNetwork

  constructor(
    private readonly router: Router,
    private readonly cycleService: CycleService,
    private readonly chainNetworkService: ChainNetworkService,
    private readonly elementRef: ElementRef,
    private readonly breakpointObserver: BreakpointObserver
  ) {
    this.currentCycle = this.cycleService.currentCycle$
    this.cycleProgress = this.cycleService.cycleProgress$
    this.remainingTime = this.cycleService.remainingTime$
    this.selectedNetwork = this.chainNetworkService.getNetwork()
    this.breakpointObserver
      .observe([Breakpoints.HandsetLandscape, Breakpoints.HandsetPortrait])
      .pipe(map(breakpointState => breakpointState.matches))
      .subscribe(isMobile => {
        isMobile ? (this.triggers = '') : (this.triggers = 'hover')
      })
  }

  public navigate(entity: string) {
    this.router.navigate([`${entity}/list`])
  }
  public ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  public changeNetwork(name: TezosNetwork) {
    this.chainNetworkService.changeEnvironment(name)
  }
}
