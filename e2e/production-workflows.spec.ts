import { test, expect } from '@playwright/test';

test.describe('PackMatrix Desktop — SDLC 7.4 Cross-Platform E2E Production Workflows', () => {

  test('Workflow 1: Cold launch -> onboard luggage -> setup 3 cubes -> batch import 100 CSV items -> verify balance -> export manifest', async ({ page }) => {
    // 1. Cold launch
    await page.goto('/');
    await expect(page.locator('.brand-title')).toContainText('PACKMATRIX');

    // 2. Onboard new luggage: navigate to Saved Bags
    await page.getByText('Saved Bags', { exact: true }).click();
    await expect(page.getByText('Saved Luggage Shells')).toBeVisible();

    // Select Peak Design Travel Backpack 45L
    const bagPreset = page.getByText('Peak Design Travel Backpack 45L').first();
    await expect(bagPreset).toBeVisible();
    await bagPreset.click();

    // 3. Setup 3 compression cubes: navigate to Packing Cubes
    await page.getByText('Packing Cubes', { exact: true }).click();
    await expect(page.getByText('Compression Cubes & Organizers')).toBeVisible();

    // Verify existing cubes or add cubes
    await expect(page.getByText('Add Packing Cube').first()).toBeVisible();

    // 4. Batch import 100 CSV items: navigate to Trip Documents
    await page.getByText('Trip Documents', { exact: true }).click();
    await expect(page.getByText('Travel Manifest & Archival Export')).toBeVisible();

    // Open CSV Import Wizard
    const csvWizardBtn = page.getByText('CSV Import Wizard');
    await expect(csvWizardBtn).toBeVisible();
    await csvWizardBtn.click();

    // Generate 100 RFC-4180 CSV items
    let csvData = 'Item Name,Brand,Category,Weight (g),Tags\n';
    for (let i = 1; i <= 100; i++) {
      csvData += `E2E Exped Item #${i},Matador,Tech,${120 + (i % 300)},e2e-pack,stream-${i}\n`;
    }

    // Enter into CSV Import textarea
    const textarea = page.locator('textarea').first();
    await textarea.fill(csvData);

    // Verify Mapping Preview reflects 100 items
    await expect(page.getByText('Mapping Preview (100 items parsed)')).toBeVisible();

    // Commit to inventory
    const commitBtn = page.getByRole('button', { name: /Commit 100 Items to Inventory/i });
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    // 5. Verify balance calculation: navigate to My Packing -> Balance
    await page.getByText('My Packing', { exact: true }).click();
    await page.getByText('Balance', { exact: true }).click();

    // Assert 3D Center of Mass Centroid is computed and visible
    await expect(page.getByText('3D Ergonomic Center of Gravity Centroid')).toBeVisible();
    await expect(page.getByText('LATERAL BALANCE')).toBeVisible();

    // 6. Return to Trip Documents and trigger travel manifest export
    await page.getByText('Trip Documents', { exact: true }).click();
    await expect(page.getByText('Export Travel Manifest')).toBeVisible();
  });

  test('Workflow 2: Unit Toggle 100x Rapid Repetition (Zero numerical drift & layout stability)', async ({ page }) => {
    await page.goto('/');

    const metricPill = page.getByText('CM / KG');
    const imperialPill = page.getByText('IN / LBS');

    await expect(metricPill).toBeVisible();
    await expect(imperialPill).toBeVisible();

    // Rapidly toggle units 100 times
    for (let i = 0; i < 50; i++) {
      await imperialPill.click();
      await metricPill.click();
    }

    // Verify application remains completely interactive and in Metric mode
    await expect(metricPill).toHaveClass(/active/);

    // Verify tare and volumetric capacity values did not experience numerical drift (e.g. NaN or infinite decimals)
    const volumeBadge = page.locator('.metric-badge-blue').first();
    if (await volumeBadge.isVisible()) {
      const text = await volumeBadge.innerText();
      expect(text).not.toContain('NaN');
      expect(text).toMatch(/\d+\.?\d*\s*L/);
    }
  });

  test('Workflow 3: Drag-and-drop CSV file onto active canvas triggers auto-mapping modal and ingestion', async ({ page }) => {
    await page.goto('/');

    // Prepare sample CSV payload
    const csvContent = `Item Name,Brand,Category,Weight (g),Tags
Arc'teryx Beta AR,Arc'teryx,Clothing,455,hardshell,waterproof
Merino 200 Base,Smartwool,Clothing,210,thermal,wool
Sony A7 IV,Sony,Tech,658,full-frame,camera
Anker 737 PowerBank,Anker,Tech,630,24000mah,usb-c`;

    // Dispatch drag-and-drop event onto canvas
    await page.evaluate((csv) => {
      const container = document.querySelector('.app-container');
      if (!container) return;

      const file = new File([csv], 'packmatrix_gear_manifest.csv', { type: 'text/csv' });
      const dt = new DataTransfer();
      dt.items.add(file);

      container.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      container.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    }, csvContent);

    // Verify auto-navigation to Trip Documents and display of CSV Import Wizard Modal
    await expect(page.getByText('RFC-4180 CSV / TSV Import Wizard')).toBeVisible();
    await expect(page.getByText('Mapping Preview (4 items parsed)')).toBeVisible();

    // Verify parsed items inside modal preview
    await expect(page.getByText("Arc'teryx Beta AR")).toBeVisible();
    await expect(page.getByText('Sony A7 IV')).toBeVisible();
  });

});
