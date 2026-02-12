import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import frLocale from '@fullcalendar/core/locales/fr';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';

import { GroupeDto, GroupeService } from '../../service/groupe';
import {
  PlanningService,
  PeriodePlanningDto,
  PlanningRangeResultDto,
} from '../../service/planning';

type GroupeColorMap = Map<string, string>;

@Component({
  selector: 'app-planning-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FormsModule],
  templateUrl: './planning-calendar.html',
  styleUrls: ['./planning-calendar.css'],
})
export class PlanningCalendarComponent {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  // ── Groupes (remplace assignees) ────────────────────────────
  groupes: GroupeDto[] = [];
  private groupesById = new Map<string, GroupeDto>();
  colorByGroupeCode: GroupeColorMap = new Map();

  // ── Génération range ────────────────────────────────────────
  rangeForm = {
    anneeDebut: new Date().getFullYear(),
    moisDebut: new Date().getMonth() + 1, // 1..12
    anneeFin: new Date().getFullYear(),
    moisFin: new Date().getMonth() + 1,
    overwrite: false,
  };

  loading = false;
  formError = '';

  // ── Mois affiché ───────────────────────────────────────────
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1; // 1..12

  // ── Résultat range en mémoire (pour dropdown) ───────────────
  generatedPlannings: PeriodePlanningDto[] = [];
  selectedPeriodeId: string | null = null;

  // ── FullCalendar ───────────────────────────────────────────
  private events: EventInput[] = [];

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    locale: frLocale,
    headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
    events: [],
    eventDisplay: 'block',
    dayMaxEvents: 2,
    fixedWeekCount: false,
    firstDay: 1,
    editable: false,
    selectable: false,
    eventBorderColor: 'transparent',
  };

  constructor(
    private groupeApi: GroupeService,
    private planningApi: PlanningService,
  ) {}

  ngOnInit(): void {
    this.loadGroupes();
  }

  // ── Load groupes ────────────────────────────────────────────
  private loadGroupes(): void {
    this.formError = '';

    this.groupeApi.getGroupes().subscribe({
      next: (groupes) => {
        this.groupes = (groupes ?? []).filter((g) => g.actif);
        this.groupesById = new Map(this.groupes.map((g) => [g.id, g]));
        this.colorByGroupeCode = this.buildColorMap(this.groupes);
      },
      error: (err) => {
        console.error(err);
        this.formError = 'Impossible de charger la liste des groupes.';
      },
    });
  }

  // ── POST /generer-range + afficher directement ──────────────
  genererRange(): void {
    this.formError = '';

    if (!this.isRangeValid()) return;

    this.loading = true;

    const req = {
      anneeDebut: Number(this.rangeForm.anneeDebut),
      moisDebut: Number(this.rangeForm.moisDebut),
      anneeFin: Number(this.rangeForm.anneeFin),
      moisFin: Number(this.rangeForm.moisFin),
      overwrite: !!this.rangeForm.overwrite,
    };

    this.planningApi.genererRange(req).subscribe({
      next: (result: PlanningRangeResultDto) => {
        console.log('Réponse POST /generer-range =', result);

        this.loading = false;

        this.generatedPlannings = result?.plannings ?? [];

        if (!this.generatedPlannings.length) {
          this.formError = 'Aucun planning généré.';
          this.clearCalendar();
          return;
        }

        const first = this.generatedPlannings[0];

        console.log('Premier planning généré =', first);

        this.selectedPeriodeId = first.periodeId;
        this.showPlanning(first);
      },

      error: (err) => {
        this.loading = false;
        console.error('POST generer-range error', err?.status, err?.error);
        this.formError =
          err?.error?.message ?? err?.message ?? 'Erreur lors de la génération du planning.';
      },
    });
  }

  // ── Dropdown : afficher un mois généré (sans GET) ───────────
  onSelectGeneratedMonth(): void {
    if (!this.selectedPeriodeId) return;
    const found = this.generatedPlannings.find((p) => p.periodeId === this.selectedPeriodeId);
    if (!found) return;
    this.showPlanning(found);
  }

  // ── Option : charger un mois via GET /{annee}/{mois} ────────
  loadPlanningFromApi(annee: number, mois: number): void {
    this.formError = '';
    this.loading = true;

    this.planningApi.getPlanning(annee, mois).subscribe({
      next: (dto) => {
        console.log('Réponse GET /planning =', dto);

        this.loading = false;
        this.showPlanning(dto);
      },

      error: (err) => {
        this.loading = false;
        console.error('GET planning error', err?.status, err?.error);

        if (err?.status === 404) {
          this.formError = `Aucun planning trouvé pour ${annee}/${mois}. Génère-le d'abord.`;
        } else {
          this.formError = err?.error?.message ?? `Erreur API (${err?.status ?? '??'}).`;
        }

        this.clearCalendar();
      },
    });
  }

  // ── Affichage centralisé ───────────────────────────────────
  private showPlanning(dto: PeriodePlanningDto): void {
    this.currentYear = dto.annee;
    this.currentMonth = dto.mois;

    this.events = this.buildEventsFromPlanning(dto);
    this.calendarOptions = { ...this.calendarOptions, events: [...this.events] };

    queueMicrotask(() => {
      this.calendarComponent?.getApi()?.gotoDate(new Date(dto.annee, dto.mois - 1, 1));
    });
  }

  private clearCalendar(): void {
    this.events = [];
    this.calendarOptions = { ...this.calendarOptions, events: [] };
  }

  // ── Mapping planning -> events ─────────────────────────────
  private buildEventsFromPlanning(dto: PeriodePlanningDto): EventInput[] {
    const res: EventInput[] = [];
    console.log('buildEventsFromPlanning dto =', dto);

    for (const dim of dto.dimanches ?? []) {
      for (const aff of dim.affectations ?? []) {
        const color = this.colorByGroupeCode.get(aff.groupeCode) ?? '#64748B';

        res.push({
          title: aff.groupeLibelle,
          start: dim.dateDimanche, // YYYY-MM-DD
          allDay: true,
          color,
          textColor: '#ffffff',
          extendedProps: {
            periodeId: dto.periodeId,
            dimancheId: dim.id,
            first: dim.first,
            last: dim.last,
            groupeId: aff.groupeId,
            groupeCode: aff.groupeCode,
            service: aff.service,
          },
        });
      }
    }

    console.log('Events construits =', res);

    return res;
  }

  // ── Validation range ───────────────────────────────────────
  private isRangeValid(): boolean {
    const ad = Number(this.rangeForm.anneeDebut);
    const md = Number(this.rangeForm.moisDebut);
    const af = Number(this.rangeForm.anneeFin);
    const mf = Number(this.rangeForm.moisFin);

    if (!ad || !md || !af || !mf) {
      this.formError = 'Veuillez remplir année/mois début et année/mois fin.';
      return false;
    }
    if (md < 1 || md > 12 || mf < 1 || mf > 12) {
      this.formError = 'Les mois doivent être entre 1 et 12.';
      return false;
    }

    // compare (annee,mois)
    const start = ad * 12 + (md - 1);
    const end = af * 12 + (mf - 1);

    if (end < start) {
      this.formError = 'La période de fin doit être après la période de début.';
      return false;
    }
    return true;
  }

  // ── Couleurs stables ───────────────────────────────────────
  private buildColorMap(groupes: GroupeDto[]): GroupeColorMap {
    const palette = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2', '#0EA5E9'];
    const map = new Map<string, string>();

    let i = 0;
    for (const g of groupes) {
      if (!map.has(g.code)) {
        map.set(g.code, palette[i % palette.length]);
        i++;
      }
    }
    return map;
  }

  // ── Utils UI ───────────────────────────────────────────────
  monthLabel(m: number): string {
    const names = [
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Juin',
      'Juil',
      'Aoû',
      'Sep',
      'Oct',
      'Nov',
      'Déc',
    ];
    return names[m - 1] ?? String(m);
  }

  periodeLabel(p: PeriodePlanningDto): string {
    return `${this.monthLabel(p.mois)} ${p.annee}`;
  }
}
