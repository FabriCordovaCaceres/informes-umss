import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../models/models';
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  list() {
    return this.http.get<User[]>(environment.apiUrl + '/usuarios');
  }
  save(value: Partial<User> & { password?: string }) {
    return value.id
      ? this.http.put(environment.apiUrl + '/usuarios/' + value.id, value)
      : this.http.post(environment.apiUrl + '/usuarios', value);
  }
}
