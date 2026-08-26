import { HttpInterceptorFn } from '@angular/common/http';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiReq = req.clone({
    url: req.url.startsWith('http') ? req.url : `http://localhost:5000/api${req.url}`
  });
  return next(apiReq);
};
