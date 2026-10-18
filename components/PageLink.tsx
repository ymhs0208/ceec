import React from 'react';
import { ActivePage, buildAppRoute } from '../utils/appRoutes';

type PageLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  page: ActivePage;
  examId: string;
};

// Keep ordinary clicks inside the app, while copy-link and new-tab work natively.
const PageLink = ({ page, examId, onClick, ...props }: PageLinkProps) => (
  <a {...props} href={buildAppRoute(page, examId)} onClick={event => {
    if (!onClick || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return;
    event.preventDefault();
    onClick(event);
  }} />
);

export default PageLink;
