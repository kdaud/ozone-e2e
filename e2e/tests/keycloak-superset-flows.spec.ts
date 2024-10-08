import { test, expect } from '@playwright/test';
import { Keycloak } from '../utils/functions/keycloak';
import { OpenMRS, delay } from '../utils/functions/openmrs';
import { Superset, randomSupersetRoleName} from '../utils/functions/superset';
import { KEYCLOAK_URL } from '../utils/configs/globalSetup';

let openmrs: OpenMRS;
let keycloak: Keycloak;
let superset: Superset;

test.beforeEach(async ({ page }) => {
  openmrs = new OpenMRS(page);
  keycloak = new Keycloak(page);
  superset = new Superset(page);

  await openmrs.login();
});

test('Creating a Superset role creates the corresponding Keycloak role.', async ({ page }) => {
  // setup
  await superset.open();

  // replay
  await superset.addRole();

  // verify
  await keycloak.open();
  await keycloak.goToClients();
  await keycloak.selectSupersetId();
  await keycloak.searchSupersetRole();
  await expect(page.locator('tbody:nth-child(2) td:nth-child(1) a')).toHaveText(`${randomSupersetRoleName.roleName}`);
  await superset.deleteRole();
});

test('Updating a synced Superset role updates the corresponding Keycloak role.', async ({ page }) => {
  // setup
  await superset.open();
  await superset.addRole();
  await keycloak.open();
  await keycloak.goToClients();
  await keycloak.selectSupersetId();
  await keycloak.searchSupersetRole();
  await expect(page.locator('tbody:nth-child(2) td:nth-child(1) a')).toHaveText(`${randomSupersetRoleName.roleName}`);

  // replay
  await superset.updateRole();

  // verify
  await page.goto(`${KEYCLOAK_URL}/admin/master/console`);
  await keycloak.goToClients();
  await keycloak.selectSupersetId();
  await keycloak.searchSupersetRole();
  await expect(page.getByText(`${randomSupersetRoleName.roleName}`)).not.toBeVisible();
  await expect(page.getByText(`${randomSupersetRoleName.updatedRoleName}`)).toBeVisible();
  await superset.deleteUpdatedRole();
});

test('Deleting a synced Superset role deletes the corresponding Keycloak role.', async ({ page }) => {
  // setup
  await superset.open();
  await superset.addRole();
  await keycloak.open();
  await keycloak.goToClients();
  await keycloak.selectSupersetId();
  await keycloak.searchSupersetRole();
  await expect(page.locator('tbody:nth-child(2) td:nth-child(1) a')).toHaveText(`${randomSupersetRoleName.roleName}`);
  
  // replay
  await superset.deleteRole();
  await delay(60000);

  // verify
  await page.goto(`${KEYCLOAK_URL}/admin/master/console`);
  await keycloak.goToClients();
  await keycloak.selectSupersetId();
  await keycloak.searchSupersetRole();
  await expect(page.getByText(`${randomSupersetRoleName.roleName}`)).not.toBeVisible();
});

test('A synced role deleted from within Keycloak gets recreated in the subsequent polling cycle.', async ({ page }) => {
  // setup
  await superset.open();
  await superset.addRole();
  await keycloak.open();
  await keycloak.goToClients();
  await keycloak.selectSupersetId();
  await keycloak.searchSupersetRole();
  await expect(page.locator('tbody:nth-child(2) td:nth-child(1) a')).toHaveText(`${randomSupersetRoleName.roleName}`);

  // replay
  await keycloak.deleteSyncedRole();

  // verify
  await page.getByLabel('Manage').getByRole('link', { name: 'Clients' }).click();
  await keycloak.selectSupersetId();
  await keycloak.searchSupersetRole();
  await expect(page.locator('tbody:nth-child(2) td:nth-child(1) a')).toHaveText(`${randomSupersetRoleName.roleName}`);
  await superset.deleteRole();
});

test.afterEach(async ({ page }) => {
  await page.close();
});
