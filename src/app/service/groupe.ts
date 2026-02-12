import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/* ========= DTO ========= */

export interface GroupeDto {
  id: string;
  code: string;
  libelle: string;
  actif: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GroupeService {

  // ⚠️ adapte l'URL selon ton backend
  private readonly baseUrl = 'http://localhost:8080/api/groupes';

  constructor(private http: HttpClient) {}

  getGroupes(): Observable<GroupeDto[]> {
    return this.http.get<GroupeDto[]>(this.baseUrl);
  }
}
