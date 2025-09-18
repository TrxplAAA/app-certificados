import { Component } from '@angular/core';
import { CertificateGeneratorComponent } from './certificate-generator/certificate-generator.component';

@Component({
  selector: 'app-root',
  imports: [CertificateGeneratorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'appcertificados';
}
