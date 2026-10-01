import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Report, Defaults } from '../models/models';
@Injectable({ providedIn: 'root' })
export class InformesService {
  private http = inject(HttpClient);
  private url = environment.apiUrl + '/informes';
  list() {
    return this.http.get<Report[]>(this.url);
  }
  get(id: number) {
    return this.http.get<Report>(`${this.url}/${id}`);
  }
  save(report: Report) {
    return report.id
      ? this.http.put<Report>(`${this.url}/${report.id}`, report)
      : this.http.post<Report>(this.url, report);
  }
  duplicate(id: number) {
    return this.http.post<Report>(`${this.url}/${id}/duplicar`, {});
  }
  delete(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }
  next(year: number) {
    return this.http.get<{ numero: number; gestion: number }>(
      `${this.url}/siguiente?gestion=${year}`,
    );
  }
  document(id: number, format: 'pdf' | 'docx') {
    return this.http.get(`${this.url}/${id}/${format}`, { responseType: 'blob' });
  }
  defaults() {
    return this.http.get<Defaults>(environment.apiUrl + '/configuracion');
  }
  saveDefaults(value: Defaults) {
    return this.http.put<Defaults>(environment.apiUrl + '/configuracion', value);
  }
}
