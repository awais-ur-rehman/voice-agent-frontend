import { test, expect } from '@playwright/test';
// Synthetic public fixtures only. This is not live API integration evidence.
const id='11111111-1111-4111-8111-111111111111';
test('dashboard auth, responsive profile, Urdu fields and keyboard confirmation',async({page})=>{
 await page.route('http://localhost:8000/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let body:unknown={};
  if(path==='/auth/login')body={access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:300};
  if(path==='/auth/me')body={id,tenant_id:id,email:'synthetic@example.test',role:'owner'};
  if(path==='/dashboard/clinic')body={id,name:'Synthetic clinic · مصنوعی کلینک',timezone:'Asia/Karachi',currency:'PKR',revision:1,min_notice_min:60,horizon_days:30,cancellation_min:60,daily_limit:5,address_en:'Synthetic public fixture address',address_ur:'مصنوعی کلینک کا پتہ',preparation_en:'Synthetic preparation instructions.',preparation_ur:'براہ کرم وقت پر تشریف لائیں'};
  if(path==='/dashboard/setup')body={profile:true,providers:true,services:true,hours:true,agent:false};
  if(path==='/providers')body=[{id,name:'Synthetic provider',name_ur:'مصنوعی ڈاکٹر',active:true,specialty:'General care'}];
  if(path==='/services')body=[{id,name:'Synthetic consultation',duration_min:30,active:true}];
  if(path==='/dashboard/provider-services')body={items:[{provider_id:id,service_id:id}],total:1,offset:0,limit:25};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.getByLabel('Email *').focus();await expect(page.getByLabel('Email *')).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByLabel('Password *')).toBeFocused();
 await page.getByLabel('Email *').fill('synthetic@example.test');await page.getByLabel('Password *').fill('synthetic-password');await page.getByRole('button',{name:'Sign in'}).click();await expect(page.getByRole('heading',{name:'Set up your clinic'})).toBeVisible();
 await page.getByRole('link',{name:'Clinic profile',exact:true}).click();await expect(page.getByLabel('Address · Urdu')).toHaveValue('مصنوعی کلینک کا پتہ');
 for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1000});await page.evaluate(async()=>{scrollTo(0,0);await document.fonts.ready;});await expect(page.locator('.app-shell')).toHaveCount(1);await expect(page.getByRole('heading',{name:'Clinic profile'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`../backend/.superpowers/sdd/2026-10-28-phase-4-dashboard/task-4-fixture-${width}.png`,fullPage:false});}
 await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('link',{name:'Providers',exact:true}).click();await expect(page.getByText('مصنوعی ڈاکٹر')).toBeVisible();await page.getByRole('button',{name:'Remove',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Remove',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Sign out'}).click();await expect(page.getByRole('heading',{name:'Sign in'})).toBeVisible();expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
});
