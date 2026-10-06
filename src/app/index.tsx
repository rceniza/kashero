import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

import { AuthScreen } from "../features/auth/AuthScreen";
import { useAuth } from "../features/auth/AuthProvider";
import { PosScreen } from "../features/pos/PosScreen";
import { colors } from "../theme/tokens";
import { SqliteProductRepository } from "../data/products/SqliteProductRepository";
import { ProductCatalogService } from "../features/catalog/ProductCatalogService";
import type { CatalogItem } from "../features/catalog/types";
import { SqliteInventoryRepository } from "../data/inventory/SqliteInventoryRepository";
import { InventoryService } from "../features/inventory/InventoryService";
import { SqliteSalesRepository } from "../data/sales/SqliteSalesRepository";
import { SalesService } from "../features/sales/SalesService";
import { SqlitePaymentRepository } from "../data/payments/SqlitePaymentRepository";
import { PaymentService } from "../features/payments/PaymentService";
import { DiagnosticsService } from "../features/diagnostics/DiagnosticsService";
import { SqliteDiagnosticRepository } from "../data/diagnostics/SqliteDiagnosticRepository";
import { SqliteStoreSettingsRepository } from "../data/settings/SqliteStoreSettingsRepository";
import { TaxSettingsService } from "../features/settings/TaxSettingsService";

export default function IndexScreen() {
  const { loading, needsSetup, user, logout } = useAuth();
  const database = useSQLiteContext();
  const catalogService = useMemo(
    () => new ProductCatalogService(new SqliteProductRepository(database)),
    [database],
  );
  const inventoryService = useMemo(
    () => new InventoryService(new SqliteInventoryRepository(database)),
    [database],
  );
  const salesService = useMemo(
    () => new SalesService(new SqliteSalesRepository(database)),
    [database],
  );
  const paymentService = useMemo(
    () => new PaymentService(new SqlitePaymentRepository(database)),
    [database],
  );
  const diagnosticsService = useMemo(
    () => new DiagnosticsService(new SqliteDiagnosticRepository(database)),
    [database],
  );
  const taxSettingsService = useMemo(
    () => new TaxSettingsService(new SqliteStoreSettingsRepository(database)),
    [database],
  );
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState(false);

  const refreshCatalog = useCallback(async () => {
    try {
      const [items, categories] = await Promise.all([
        catalogService.listPosCatalog(),
        catalogService.listCategories(),
      ]);
      setCatalogItems(items);
      setCategoryNames(categories.map(({ name }) => name));
      setCatalogError(false);
      setCatalogReady(true);
    } catch {
      setCatalogError(true);
      setCatalogReady(true);
      void diagnosticsService.log("error", "catalog.refresh.failed").catch(() => undefined);
    }
  }, [catalogService, diagnosticsService]);

  useEffect(() => {
    let mounted = true;
    Promise.all([catalogService.listPosCatalog(), catalogService.listCategories()])
      .then(([items, categories]) => {
        if (!mounted) return;
        setCatalogItems(items);
        setCategoryNames(categories.map(({ name }) => name));
        setCatalogError(false);
        setCatalogReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setCatalogError(true);
        setCatalogReady(true);
        void diagnosticsService.log("error", "catalog.load.failed").catch(() => undefined);
      });
    return () => { mounted = false; };
  }, [catalogService, diagnosticsService]);

  if (loading) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  if (!user) return <AuthScreen key={needsSetup ? "setup" : "login"} />;
  if (!catalogReady) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  if (catalogError) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background, padding: 24 }}><Text style={{ color: colors.ink }}>Could not load the catalog. Please restart Kashero.</Text></View>;
  return <PosScreen user={user} onLogout={logout} catalogItems={catalogItems} categoryNames={categoryNames} catalogService={catalogService} inventoryService={inventoryService} salesService={salesService} paymentService={paymentService} diagnosticsService={diagnosticsService} taxSettingsService={taxSettingsService} onCatalogChanged={refreshCatalog} />;
}
