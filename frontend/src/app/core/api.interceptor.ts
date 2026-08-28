import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from './environment';

/**
 * Prefixes relative request URLs with the configured API base URL.
 * Absolute URLs are passed through untouched.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (/^https?:\/\//i.test(req.url)) {
    return next(req);
  }
  const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
  return next(req.clone({ url: `${environment.apiUrl}${path}` }));
};
