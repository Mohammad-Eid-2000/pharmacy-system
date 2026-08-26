import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <app-layout>
      <router-outlet></router-outlet>
    </app-layout>
  `
})
export class AppComponent {}
