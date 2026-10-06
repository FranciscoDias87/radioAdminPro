"use client";
import {Children,isValidElement,type ComponentProps,type ReactNode} from 'react';
import {SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';
import {cn} from '@/lib/utils';

export function NavigationButton({onClick,className,...props}:ComponentProps<typeof SidebarMenuButton>){
 const {isMobile,setOpenMobile}=useSidebar();
 const text=Children.toArray(props.children).find(child=>isValidElement(child)&&child.type==='span');
 const label=isValidElement<{children?:ReactNode}>(text)&&typeof text.props.children==='string'?text.props.children:undefined;
 return <SidebarMenuButton {...props} tooltip={props.tooltip||label} aria-label={props['aria-label']||label} className={cn('group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center',className)} onClick={event=>{
  onClick?.(event);
  if(isMobile&&!event.defaultPrevented)setOpenMobile(false);
 }}/>;
}
