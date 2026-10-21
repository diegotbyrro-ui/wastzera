import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {catalog} from '../lib/catalog.ts';
test('catálogo tem imagens locais completas, IDs únicos e um único GIFT CARD',()=>{const skins=catalog.filter(x=>x.kind==='skin');assert.ok(skins.length>=2000);assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);assert.deepEqual(catalog.filter(x=>x.kind==='gift').map(x=>x.name),['GIFT CARD']);for(const skin of skins){assert.ok(skin.name&&skin.image);const path=new URL('../public'+skin.image,import.meta.url);assert.ok(existsSync(path),'Imagem ausente: '+skin.name);assert.deepEqual([...readFileSync(path).subarray(0,8)],[137,80,78,71,13,10,26,10])}});
