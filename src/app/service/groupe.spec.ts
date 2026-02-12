import { TestBed } from '@angular/core/testing';

import { GroupeService } from './groupe';

describe('Groupe', () => {
  let service: GroupeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GroupeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
