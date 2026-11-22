"use client"

import Footer from "@/components/Bottom";
import Header from "@/components/Header";
import SideNav from "@/components/SideNav";
import React, { useState } from "react";
import AdminRoleGuard from "@/components/AdminRoleGuard";



function Layout({ children }: { children: React.ReactNode }) {


  return (
    <div id="page-wrapper">
      <Header />
      <SideNav />
      <Footer />
      <main><AdminRoleGuard>{children}</AdminRoleGuard></main>
    </div>
  );
}

export default Layout;
