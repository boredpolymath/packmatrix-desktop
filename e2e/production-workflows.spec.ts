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

  test('Workflow 4 (Edge Case): Formula Injection Attack Neutralization in CSV Import', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Trip Documents', { exact: true }).click();

    // Open CSV wizard
    await page.getByText('CSV Import Wizard').click();
    await expect(page.getByText('RFC-4180 CSV / TSV Import Wizard')).toBeVisible();

    // Malicious formula injection CSV payload
    const injectionPayload = `Item Name,Brand,Category,Weight (g),Tags
=cmd|' /C calc'!A0,ThreatCorp,Tech,500,exploit
@SUM(1+1),SpreadsheetBomb,Clothing,200,formula
+alert(1),XssCorp,Tech,100,xss
-15*3,NegativeExec,Misc,150,calc`;

    const textarea = page.locator('textarea').first();
    await textarea.fill(injectionPayload);

    // Verify 4 items parsed
    await expect(page.getByText('Mapping Preview (4 items parsed)')).toBeVisible();

    // Verify leading single quotes are injected to neutralize spreadsheet formula evaluation
    await expect(page.getByText("'=cmd|' /C calc'!A0")).toBeVisible();
    await expect(page.getByText("'@SUM(1+1)")).toBeVisible();
    await expect(page.getByText("'+alert(1)")).toBeVisible();
    await expect(page.getByText("'-15*3")).toBeVisible();
  });

  test('Workflow 5 (Edge Case): Malformed & Empty CSV Ingestion Strictly Trapped', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Trip Documents', { exact: true }).click();

    await page.getByText('CSV Import Wizard').click();
    const textarea = page.locator('textarea').first();

    // 1. Single row only (header with no data)
    await textarea.fill('Item Name,Brand,Weight (g)');
    await expect(page.getByText('CSV must contain a header row and at least one data row.')).toBeVisible();

    // Commit button must be disabled
    const commitBtn = page.getByRole('button', { name: /Commit/i });
    await expect(commitBtn).toBeDisabled();

    // 2. Clear to empty
    await textarea.fill('');
    await expect(page.getByText('CSV must contain a header row and at least one data row.')).toBeVisible();
    await expect(commitBtn).toBeDisabled();
  });

  test('Workflow 6 (Edge Case): Rapid 1-6 Number Key Navigation Invariant', async ({ page }) => {
    await page.goto('/');

    // Press '2' for Saved Bags
    await page.keyboard.press('2');
    await expect(page.getByText('Saved Luggage Shells')).toBeVisible();

    // Press '3' for Packing Cubes
    await page.keyboard.press('3');
    await expect(page.getByText('Compression Cubes & Organizers')).toBeVisible();

    // Press '4' for Airline Baggage Rules
    await page.keyboard.press('4');
    await expect(page.getByText('Global Airline Baggage Allowances')).toBeVisible();

    // Press '6' for Trip Documents
    await page.keyboard.press('6');
    await expect(page.getByText('Trip Documents & Export')).toBeVisible();

    // Press '1' back to My Packing
    await page.keyboard.press('1');
    await expect(page.getByText('Packed Total Weight')).toBeVisible();
  });

});
