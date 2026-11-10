import {
  AppstoreOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  MessageOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons"
import { ErrorComponent, ThemedLayout, useNotificationProvider } from "@refinedev/antd"
import { Authenticated, Refine } from "@refinedev/core"
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router"
import { App as AntdApp, Spin } from "antd"
import { lazy, Suspense } from "react"
import { BrowserRouter, Outlet, Route, Routes } from "react-router"
import { AppHeader } from "@/layout/AppHeader"
import { AppTitle } from "@/layout/AppTitle"
import { SessionWatcher } from "@/layout/SessionWatcher"
import { LoginPage } from "@/pages/login/LoginPage"
import { TrackCreate } from "@/pages/tracks/TrackCreate"
import { TrackEdit } from "@/pages/tracks/TrackEdit"
import { TrackList } from "@/pages/tracks/TrackList"
import { TrackShow } from "@/pages/tracks/TrackShow"
import { AlbumCreate } from "@/pages/albums/AlbumCreate"
import { AlbumEdit } from "@/pages/albums/AlbumEdit"
import { AlbumList } from "@/pages/albums/AlbumList"
import { AlbumShow } from "@/pages/albums/AlbumShow"
import { ArtistCreate } from "@/pages/artists/ArtistCreate"
import { ArtistEdit } from "@/pages/artists/ArtistEdit"
import { ArtistList } from "@/pages/artists/ArtistList"
import { ArtistShow } from "@/pages/artists/ArtistShow"
import { FeedCreate } from "@/pages/feed/FeedCreate"
import { FeedList } from "@/pages/feed/FeedList"
import { SettingsPage } from "@/pages/settings/SettingsPage"
import { UserList } from "@/pages/users/UserList"
import { authProvider } from "@/providers/authProvider"
import { dataProvider } from "@/providers/dataProvider"
import { i18nProvider } from "@/providers/i18nProvider"
import { ColorModeProvider } from "@/theme/ColorModeProvider"

// The heaviest pages (charts, the lyrics editor) load when they are opened, not with the login page.
const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })),
)
const LyricsEditorPage = lazy(() =>
  import("@/pages/lyrics/LyricsEditorPage").then((module) => ({
    default: module.LyricsEditorPage,
  })),
)

function PageLoading() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
      <Spin size="large" />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ColorModeProvider>
        <AntdApp>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
            i18nProvider={i18nProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              disableTelemetry: true,
              title: { text: "Music Stream Admin" },
            }}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: { label: "Dashboard", icon: <DashboardOutlined /> },
              },
              {
                name: "tracks",
                list: "/tracks",
                create: "/tracks/create",
                edit: "/tracks/edit/:id",
                show: "/tracks/show/:id",
                meta: { label: "Bài hát", icon: <CustomerServiceOutlined /> },
              },
              {
                name: "artists",
                list: "/artists",
                create: "/artists/create",
                edit: "/artists/edit/:id",
                show: "/artists/show/:id",
                meta: { label: "Nghệ sĩ", icon: <UserOutlined /> },
              },
              {
                name: "albums",
                list: "/albums",
                create: "/albums/create",
                edit: "/albums/edit/:id",
                show: "/albums/show/:id",
                meta: { label: "Album", icon: <AppstoreOutlined /> },
              },
              {
                name: "users",
                list: "/users",
                meta: { label: "Người dùng", icon: <TeamOutlined /> },
              },
              {
                name: "feed",
                list: "/feed",
                create: "/feed/create",
                meta: { label: "Feed", icon: <MessageOutlined /> },
              },
              {
                name: "settings",
                list: "/settings",
                meta: { label: "Cài đặt", icon: <SettingOutlined /> },
              },
            ]}
          >
            <SessionWatcher />
            <Routes>
              <Route
                element={
                  <Authenticated key="admin" fallback={<CatchAllNavigate to="/login" />}>
                    <ThemedLayout Header={AppHeader} Title={AppTitle}>
                      <Suspense fallback={<PageLoading />}>
                        <Outlet />
                      </Suspense>
                    </ThemedLayout>
                  </Authenticated>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="/tracks">
                  <Route index element={<TrackList />} />
                  <Route path="create" element={<TrackCreate />} />
                  <Route path="edit/:id" element={<TrackEdit />} />
                  <Route path="show/:id" element={<TrackShow />} />
                  <Route path=":id/lyrics" element={<LyricsEditorPage />} />
                </Route>
                <Route path="/artists">
                  <Route index element={<ArtistList />} />
                  <Route path="create" element={<ArtistCreate />} />
                  <Route path="edit/:id" element={<ArtistEdit />} />
                  <Route path="show/:id" element={<ArtistShow />} />
                </Route>
                <Route path="/albums">
                  <Route index element={<AlbumList />} />
                  <Route path="create" element={<AlbumCreate />} />
                  <Route path="edit/:id" element={<AlbumEdit />} />
                  <Route path="show/:id" element={<AlbumShow />} />
                </Route>
                <Route path="/users" element={<UserList />} />
                <Route path="/feed">
                  <Route index element={<FeedList />} />
                  <Route path="create" element={<FeedCreate />} />
                </Route>
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<ErrorComponent />} />
              </Route>
              <Route
                element={
                  <Authenticated key="guest" fallback={<Outlet />}>
                    <NavigateToResource />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<LoginPage />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ColorModeProvider>
    </BrowserRouter>
  )
}
