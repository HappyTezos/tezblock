import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { UnitHelper } from 'test-config/unit-test-helper'

import { TransactionDetailWrapperComponent } from './transaction-detail-wrapper.component'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { MomentModule } from 'ngx-moment'
import { LoadingSkeletonComponent } from '../loading-skeleton/loading-skeleton.component'

describe('TransactionDetailWrapperComponent', () => {
  let component: TransactionDetailWrapperComponent
  let fixture: ComponentFixture<TransactionDetailWrapperComponent>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [AmountConverterPipe],
        imports: [FontAwesomeModule, MomentModule],
        declarations: [TransactionDetailWrapperComponent, LoadingSkeletonComponent]
      })
    )
      .compileComponents()
      .catch(console.error)
  })
  beforeEach(() => {
    fixture = TestBed.createComponent(TransactionDetailWrapperComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
