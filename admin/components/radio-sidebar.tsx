"use client";
import type {ComponentProps} from "react";
import {Sidebar} from "@/components/ui/sidebar";
export function RadioSidebar(props:ComponentProps<typeof Sidebar>){return <Sidebar {...props} collapsible="icon"/>;}
