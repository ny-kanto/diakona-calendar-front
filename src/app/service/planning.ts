import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/* =========================
   DTOs (basés sur ton JSON)
   ========================= */

export type ServiceCode = 'SERVICE_1' | 'SERVICE_2' | string;

export interface GeneratePlanningRangeRequest {
  anneeDebut: number;
  moisDebut: number;   // 1..12
  anneeFin: number;
  moisFin: number;     // 1..12
  overwrite?: boolean | null;
}

export interface PlanningRangeResultDto {
  totalMois: number;
  plannings: PeriodePlanningDto[];
}

export interface PeriodePlanningDto {
  periodeId: string;
  annee: number;
  mois: number; // 1..12
  leaderGroupeId: string;
  leaderService: ServiceCode;
  dimanches: DimanchePlanningDto[];
}

export interface DimanchePlanningDto {
  id: string;
  dateDimanche: string; // "YYYY-MM-DD"
  first: boolean;
  last: boolean;
  affectations: AffectationDto[];
}

export interface AffectationDto {
  id: string;
  groupeId: string;
  groupeCode: string;    // ex: "FANILO"
  groupeLibelle: string; // ex: "FANILO"
  service: ServiceCode;  // ex: "SERVICE_1"
}

/* =========================
   Service API Angular
   ========================= */

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private readonly baseUrl = 'http://localhost:8080/api/planning';

  constructor(private http: HttpClient) {}

  /** POST /generer-range */
  genererRange(req: GeneratePlanningRangeRequest): Observable<PlanningRangeResultDto> {
    return this.http.post<PlanningRangeResultDto>(`${this.baseUrl}/generer-range`, req);
  }

  /** GET /{annee}/{mois} */
  getPlanning(annee: number, mois: number): Observable<PeriodePlanningDto> {
    return this.http.get<PeriodePlanningDto>(`${this.baseUrl}/${annee}/${mois}`);
  }
}
