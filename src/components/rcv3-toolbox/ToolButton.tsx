'use client';
import type { ButtonHTMLAttributes } from 'react';
import { getTool, type ToolId } from '@/lib/rcv3/toolbox';
export default function ToolButton({toolId,children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{toolId:ToolId}) {
  const tool=getTool(toolId);
  return <button type="button" {...props} data-rc-tool={toolId} data-rc-tool-version={tool.version}>{children??tool.label}</button>;
}
