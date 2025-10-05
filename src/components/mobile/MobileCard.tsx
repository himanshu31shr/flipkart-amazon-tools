import React from 'react';
import { Card, CardHeader, CardContent, CardActions, CardProps } from '@mui/material';

export interface MobileCardProps extends Omit<CardProps, 'children'> {
  header?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  contentPadding?: number;
}

/**
 * Reusable mobile card component with consistent styling
 * Provides header, content, and actions sections with proper spacing
 */
export function MobileCard({
  header,
  children,
  actions,
  contentPadding = 2,
  ...props
}: MobileCardProps) {
  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 2,
        minHeight: 44,
        ...props.sx
      }}
      {...props}
    >
      {header && <CardHeader sx={{ pb: 0 }}>{header}</CardHeader>}
      <CardContent sx={{ p: contentPadding }}>{children}</CardContent>
      {actions && <CardActions sx={{ pt: 0 }}>{actions}</CardActions>}
    </Card>
  );
}

export default MobileCard;
