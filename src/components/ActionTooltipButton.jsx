import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function ActionTooltipButton({
  tooltip,
  placement = 'top',
  children,
  ...props
}) {
  const safeId = `tt-${(tooltip || 'action').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  return (
    <OverlayTrigger
      placement={placement}
      delay={{ show: 100, hide: 50 }}
      overlay={<Tooltip id={safeId}>{tooltip}</Tooltip>}
    >
      <Button {...props}>{children}</Button>
    </OverlayTrigger>
  );
}
