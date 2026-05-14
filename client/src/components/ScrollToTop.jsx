import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't restore scroll on navigation under HashRouter. When
// the user clicks an archive card after scrolling down the list, the new
// (often shorter) page would leave them mid-scroll — visually it looks like
// "the click sent me to the bottom." This forces top on every pathname
// change. Drop inside the Router so useLocation() works.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
