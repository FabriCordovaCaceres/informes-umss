import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Material } from '../models/models';
@Injectable({ providedIn: 'root' })
export class MaterialesService {
  private http = inject(HttpClient);
  private url = environment.apiUrl + '/materiales';
  list() {
    return this.http.get<Material[]>(this.url);
  }
  save(value: Partial<Material>) {
    return value.id
      ? this.http.put<Material>(`${this.url}/${value.id}`, value)
      : this.http.post<Material>(this.url, value);
  }
}
