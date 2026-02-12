import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningCalendar } from './planning-calendar';

describe('PlanningCalendar', () => {
  let component: PlanningCalendar;
  let fixture: ComponentFixture<PlanningCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanningCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
