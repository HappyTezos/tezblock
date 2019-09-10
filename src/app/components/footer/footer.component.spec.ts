import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { ComponentFixture, TestBed } from '@angular/core/testing'

import { FooterComponent } from './footer.component'
import { UnitHelper } from 'test-config/unit-test-helper'

describe('FooterComponent', () => {
  let component: FooterComponent
  let fixture: ComponentFixture<FooterComponent>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [],
        imports: [FontAwesomeModule],
        declarations: [FooterComponent]
      })
    )
      .compileComponents()
      .catch(console.error)
  })
  beforeEach(() => {
    fixture = TestBed.createComponent(FooterComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
