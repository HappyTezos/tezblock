import { Component, OnInit } from '@angular/core'
import { Observable, of, from } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { Store } from '@ngrx/store'
import { Actions, ofType } from '@ngrx/effects'
import { ChartOptions, ChartSize, ChartTooltipItem, ChartData } from 'chart.js'
import 'chartjs-plugin-piechart-outlabels'
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'

import { BaseComponent } from '@tezblock/components/base.component'
import { Column } from '@tezblock/components/tezblock-table/tezblock-table.component'
import { columns } from './table-definitions'
import * as fromRoot from '@tezblock/reducers'
import * as actions from './actions'
import { othersBakersLabel } from './reducer'
import { getRefresh } from '@tezblock/domain/synchronization'
import { AliasPipe } from '@tezblock/pipes/alias/alias.pipe'
import { AmountConverterPipe } from '@tezblock/pipes/amount-converter/amount-converter.pipe'
import { Baker } from '@tezblock/services/api/api.service'

const labelsParams = {
  display: true,
  stretch: 45,
  valuePrecision: 1,
  percentPrecision: 2,
  font: {
    resizable: true,
    minSize: 8,
    maxSize: 11
  }
}

// https://www.materialpalette.com/colors
const palette = [
  '#e53935',
  '#d81b60',
  '#8e24aa',
  '#5e35b1',
  '#3949ab',
  '#1e88e5',
  '#039be5',
  '#00acc1',
  '#00897b',
  '#43a047',
  '#7cb342',
  '#c0ca33',
  '#fdd835',
  '#ffb300',
  '#fb8c00',
  '#f4511e',
  '#795548',
  '#bdbdbd',
  '#78909c',
  // plus some 6 random ones ...
  '#581845',
  '#900C3F',
  '#C70039',
  '#FF5733',
  '#FFC300',
  '#BF77AA'
]

@Component({
  selector: 'app-bakers',
  templateUrl: './bakers.component.html',
  styleUrls: ['./bakers.component.scss']
})
export class BakersComponent extends BaseComponent implements OnInit {
  columns: Column[]
  loading$: Observable<boolean>
  data$: Observable<Object>
  showLoadMore$: Observable<boolean>
  totalActiveBakers$: Observable<number>
  top24ChartDatasets$: Observable<{ data: number[]; label: string }[]>
  top24ChartLabels$: Observable<string[]>
  top24ChartOptions$: Observable<ChartOptions>
  top24ChartColors: any[] = [{ backgroundColor: palette }]
  top24ChartSize$: Observable<ChartSize>
  isMobile$: Observable<boolean>

  constructor(
    private readonly actions$: Actions,
    private readonly aliasPipe: AliasPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly breakpointObserver: BreakpointObserver,
    private readonly store$: Store<fromRoot.State>
  ) {
    super()
  }

  ngOnInit() {
    this.data$ = this.store$.select(state => state.bakers.activeBakers.data)
    this.loading$ = this.store$.select(state => state.bakers.activeBakers.loading)
    this.showLoadMore$ = of(true)
    this.totalActiveBakers$ = this.store$.select(state => state.bakers.activeBakers.pagination.total)
    this.top24ChartDatasets$ = this.store$
      .select(state => state.bakers.top24Bakers)
      .pipe(
        filter(Array.isArray),
        map(data => [
          {
            data: data.map(dataItem => dataItem.staking_balance),
            label: 'Staking Balance'
          }
        ])
      )
    this.top24ChartLabels$ = this.store$
      .select(state => state.bakers.top24Bakers)
      .pipe(
        filter(Array.isArray),
        map((data: Baker[]) =>
          data.map(dataItem => (dataItem.pkh !== othersBakersLabel ? this.aliasPipe.transform(dataItem.pkh) : othersBakersLabel))
        ),
        map((labels: string[]) => labels.map(label => `${label} -`))
      )
    this.isMobile$ = this.breakpointObserver
      .observe([Breakpoints.Small, Breakpoints.Handset])
      .pipe(map(breakpointState => breakpointState.matches))
    this.top24ChartOptions$ = this.isMobile$.pipe(map(this.getOptions.bind(this)))
    this.top24ChartSize$ = this.isMobile$.pipe(map(isMobile => (isMobile ? { width: 200, height: 200 } : { width: 750, height: 440 })))

    this.subscriptions.push(
      getRefresh([
        this.actions$.pipe(ofType(actions.loadActiveBakersFailed)),
        this.actions$.pipe(ofType(actions.loadActiveBakersSucceeded))
      ]).subscribe(() => {
        this.store$.dispatch(actions.loadActiveBakers())
        this.store$.dispatch(actions.loadTotalActiveBakers())
        this.store$.dispatch(actions.loadTop24Bakers())
      })
    )

    this.columns = columns
  }

  loadMore() {
    this.store$.dispatch(actions.increasePageOfActiveBakers())
  }

  private getOptions(isMobile: boolean): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: isMobile
          ? 0
          : {
              top: 80,
              right: 130,
              bottom: 190,
              left: 130
            }
      },
      plugins: {
        outlabels: isMobile ? { display: false } : labelsParams
      },
      tooltips: {
        callbacks: {
          label: (tooltipItem: ChartTooltipItem, data: ChartData) => {
            const bakerName = (<string>data.labels[tooltipItem.index]).replace('-', ':')
            const stakingBalance = <number>data.datasets[0].data[tooltipItem.index]
            const stakingBalanceLabel = this.amountConverterPipe.transform(stakingBalance, {
              protocolIdentifier: 'xtz',
              maxDigits: 6,
              fontSmall: true,
              fontColor: true
            })

            return `${bakerName} ${stakingBalanceLabel} ꜩ`
          }
        }
      }
    }
  }
}
