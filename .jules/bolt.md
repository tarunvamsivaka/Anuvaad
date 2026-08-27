# Bolt's Journal
## 2024-08-27 - React.memo on SidebarContent
**Learning:** The desktop sidebar was unnecessarily re-rendering every time the mobile menu was toggled. This occurred because they share the same parent state (`mobileOpen`) in `DashboardSidebar`, which caused all children to re-render.
**Action:** Used `React.memo` on the shared UI component (`SidebarContent`) and `useCallback` for the close handler (`handleMobileClose`). This completely isolates state changes to the components that actually need them (the mobile sidebar layout), preventing DOM reconciliation in the heavier desktop sidebar.
