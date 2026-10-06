"use client";
import type {ComponentProps} from 'react';
import {SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';

export function NavigationButton({onClick,...props}:ComponentProps<typeof SidebarMenuButton>){
 const {isMobile,setOpenMobile}=useSidebar();
 return <SidebarMenuButton {...props} onClick={event=>{
  onClick?.(event);
  if(isMobile&&!event.defaultPrevented)setOpenMobile(false);
 }}/>;
}
