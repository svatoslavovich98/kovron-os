"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, ChevronRight, Image, Plus, X } from "lucide-react";

// Demo template data — in production this comes from Supabase + kovron-data.js import
const templateData: Record<string, { name: string; type: "pol" | "bag" | "rh"; hasImage: boolean }[]> = {
  Acura: [
    { name: "Acura MDX 2014-2020", type: "pol", hasImage: true },
    { name: "Acura RDX 2019-н.в.", type: "pol", hasImage: true },
    { name: "Acura TLX 2021-н.в.", type: "pol", hasImage: false },
  ],
  Audi: [
    { name: "Audi A3 (8V) 2012-2020", type: "pol", hasImage: true },
    { name: "Audi A4 (B9) 2015-н.в.", type: "pol", hasImage: true },
    { name: "Audi A4 (B9) багажник", type: "bag", hasImage: true },
    { name: "Audi A6 (C8) 2018-н.в.", type: "pol", hasImage: true },
    { name: "Audi Q3 (F3) 2018-н.в.", type: "pol", hasImage: true },
    { name: "Audi Q5 (FY) 2017-н.в.", type: "pol", hasImage: true },
    { name: "Audi Q7 (4M) 2015-н.в.", type: "pol", hasImage: true },
    { name: "Audi Q8 (4M) 2018-н.в.", type: "pol", hasImage: false },
  ],
  BMW: [
    { name: "BMW 3 (G20) 2019-н.в.", type: "pol", hasImage: true },
    { name: "BMW 3 (G20) багажник", type: "bag", hasImage: true },
    { name: "BMW 5 (G30) 2017-н.в.", type: "pol", hasImage: true },
    { name: "BMW X1 (U11) 2022-н.в.", type: "pol", hasImage: false },
    { name: "BMW X3 (G01) 2017-н.в.", type: "pol", hasImage: true },
    { name: "BMW X5 (G05) 2018-н.в.", type: "pol", hasImage: true },
  ],
  Chery: [
    { name: "Chery Tiggo 4 2019-н.в.", type: "pol", hasImage: true },
    { name: "Chery Tiggo 7 Pro 2020-н.в.", type: "pol", hasImage: true },
    { name: "Chery Tiggo 8 Pro 2021-н.в.", type: "pol", hasImage: true },
  ],
  Haval: [
    { name: "Haval Dargo 2022-н.в.", type: "pol", hasImage: true },
    { name: "Haval F7/F7x 2019-н.в.", type: "pol", hasImage: true },
    { name: "Haval Jolion 2021-н.в.", type: "pol", hasImage: true },
  ],
  Honda: [
    { name: "Honda CR-V (RW) 2017-2022", type: "pol", hasImage: true },
    { name: "Honda CR-V (RW) багажник", type: "bag", hasImage: true },
  ],
  Hyundai: [
    { name: "Hyundai Creta (SU2) 2021-н.в.", type: "pol", hasImage: true },
    { name: "Hyundai Santa Fe (TM) 2018-н.в.", type: "pol", hasImage: true },
    { name: "Hyundai Solaris (HC) 2017-н.в.", type: "pol", hasImage: true },
    { name: "Hyundai Tucson (NX4) 2021-н.в.", type: "pol", hasImage: true },
    { name: "Hyundai Tucson (NX4) багажник", type: "bag", hasImage: true },
  ],
  Kia: [
    { name: "Kia Ceed (CD) 2018-н.в.", type: "pol", hasImage: true },
    { name: "Kia K5 (DL3) 2020-н.в.", type: "pol", hasImage: true },
    { name: "Kia Seltos 2019-н.в.", type: "pol", hasImage: true },
    { name: "Kia Sportage (NQ5) 2022-н.в.", type: "pol", hasImage: true },
    { name: "Kia Sportage (NQ5) багажник", type: "bag", hasImage: false },
  ],
  "Land Rover": [
    { name: "Range Rover Sport (L461) 2022-н.в.", type: "pol", hasImage: true },
    { name: "Range Rover Velar 2017-н.в.", type: "pol", hasImage: true },
  ],
  Lexus: [
    { name: "Lexus GX 460 2013-н.в.", type: "pol", hasImage: true },
    { name: "Lexus NX (AZ20) 2021-н.в.", type: "pol", hasImage: true },
    { name: "Lexus RX (AL20) 2015-2022", type: "pol", hasImage: true },
    { name: "Lexus RX (AL30) 2022-н.в.", type: "pol", hasImage: true },
  ],
  Mazda: [
    { name: "Mazda CX-5 (KF) 2017-н.в.", type: "pol", hasImage: true },
    { name: "Mazda CX-5 (KF) багажник", type: "bag", hasImage: true },
  ],
  Mercedes: [
    { name: "Mercedes GLC (X254) 2022-н.в.", type: "pol", hasImage: true },
    { name: "Mercedes GLE (W167) 2019-н.в.", type: "pol", hasImage: true },
    { name: "Mercedes E (W214) 2024-н.в.", type: "pol", hasImage: false },
  ],
  Mitsubishi: [
    { name: "Mitsubishi Outlander 2022-н.в.", type: "pol", hasImage: true },
    { name: "Mitsubishi Outlander багажник", type: "bag", hasImage: true },
  ],
  Nissan: [
    { name: "Nissan Qashqai (J12) 2021-н.в.", type: "pol", hasImage: true },
    { name: "Nissan X-Trail (T33) 2022-н.в.", type: "pol", hasImage: true },
  ],
  Skoda: [
    { name: "Skoda Kodiaq 2017-н.в.", type: "pol", hasImage: true },
    { name: "Skoda Octavia (A8) 2020-н.в.", type: "pol", hasImage: true },
  ],
  Subaru: [
    { name: "Subaru Forester (SK) 2018-н.в.", type: "pol", hasImage: true },
    { name: "Subaru Outback 2020-н.в.", type: "pol", hasImage: true },
  ],
  Toyota: [
    { name: "Toyota Camry (XV70) 2018-н.в.", type: "pol", hasImage: true },
    { name: "Toyota Camry (XV70) багажник", type: "bag", hasImage: true },
    { name: "Toyota Corolla (E210) 2019-н.в.", type: "pol", hasImage: true },
    { name: "Toyota Land Cruiser 300 2021-н.в.", type: "pol", hasImage: true },
    { name: "Toyota Land Cruiser Prado 150 2009-н.в.", type: "pol", hasImage: true },
    { name: "Toyota RAV4 (XA50) 2019-н.в.", type: "pol", hasImage: true },
    { name: "Toyota RAV4 (XA50) багажник", type: "bag", hasImage: true },
  ],
  Volkswagen: [
    { name: "Volkswagen Tiguan (AD1) 2017-н.в.", type: "pol", hasImage: true },
    { name: "Volkswagen Tiguan багажник", type: "bag", hasImage: true },
    { name: "Volkswagen Polo (AW) 2020-н.в.", type: "pol", hasImage: true },
  ],
};

const typeLabels = { pol: "Полный", bag: "Багажник", rh: "Руль" };
const typeColors = {
  pol: { bg: "bg-info/10", text: "text-info" },
  bag: { bg: "bg-income/10", text: "text-income" },
  rh: { bg: "bg-warning/10", text: "text-warning" },
};

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "pol" | "bag" | "rh">("all");
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  const brands = useMemo(() => {
    return Object.entries(templateData)
      .map(([brand, items]) => {
        let filtered = items;
        if (typeFilter !== "all") {
          filtered = filtered.filter((i) => i.type === typeFilter);
        }
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter((i) => i.name.toLowerCase().includes(q) || brand.toLowerCase().includes(q));
        }
        return { brand, items: filtered, total: items.length };
      })
      .filter((b) => b.items.length > 0)
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [search, typeFilter]);

  const totalTemplates = Object.values(templateData).flat().length;

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Каталог лекал</h1>
          <p className="text-sm text-muted-foreground">
            {totalTemplates} лекал • {Object.keys(templateData).length} марок
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Найти марку или модель..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {[
          { key: "all" as const, label: "Все" },
          { key: "pol" as const, label: "Полный" },
          { key: "bag" as const, label: "Багажник" },
          { key: "rh" as const, label: "Руль" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
              typeFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Brand list */}
      {brands.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Лекала не найдены</p>
        </div>
      ) : (
        <div className="space-y-2">
          {brands.map(({ brand, items }) => {
            const expanded = expandedBrands.has(brand);
            return (
              <Card key={brand}>
                <button
                  onClick={() => toggleBrand(brand)}
                  className="w-full flex items-center justify-between p-4 hover:bg-background/50 transition-colors"
                >
                  <span className="font-semibold">{brand}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-border">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-background/30 transition-colors cursor-pointer"
                      >
                        <Badge
                          className={cn(
                            "text-[10px] shrink-0",
                            typeColors[item.type].bg,
                            typeColors[item.type].text
                          )}
                          variant="outline"
                        >
                          {typeLabels[item.type]}
                        </Badge>
                        <span className="text-sm flex-1">{item.name}</span>
                        {item.hasImage && (
                          <Image className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
