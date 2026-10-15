#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { articleQualityIssue, selectCandidate, retryAnotherCandidate } from './blog_quality.mjs';

const paragraph = 'An independent games publication described a new report about Grand Theft Auto. The article distinguishes what the reporter saw from what Rockstar Games has officially announced, explains the timeline and names unknown details clearly. Readers can follow the original source without treating this third-party coverage as a confirmed announcement.';
const valid = () => ({
  title: 'Report: GTA 6 PC release could arrive later',
  sections: [
    {heading:'What the report actually says',paragraphs:[paragraph,paragraph]},
    {heading:'What remains unconfirmed',paragraphs:[paragraph,paragraph]}
  ]
});

test('valid sourced Games brief is publishable without 1,300-word Tech thresholds', () => {
  assert.equal(articleQualityIssue(valid(),{leadTitle:'Report: GTA 6 PC release'}),null);
});
test('a model rejection is a candidate skip rather than a JSON error', () => {
  assert.equal(articleQualityIssue({skip:true,reason:'Unrelated betting article'}),null);
});
test('rejects empty, placeholder, and short article sections instead of posting them', () => {
  assert.match(articleQualityIssue({title:valid().title,sections:[{heading:'None',paragraphs:[paragraph]}]}),/two substantive/);
  const draft=valid(); draft.sections[0].heading='None';
  assert.match(articleQualityIssue(draft),/descriptive heading/);
  const tiny=valid(); tiny.sections[0].paragraphs=['Only an unsourced claim.'];
  assert.match(articleQualityIssue(tiny),/too short/);
});
test('a brief with one empty section never reaches the publisher', () => {
  const draft=valid();draft.sections[1].paragraphs=[];
  assert.match(articleQualityIssue(draft),/missing paragraph/);
});
test('rumor and leak coverage needs attribution', () => {
  const draft=valid();
  draft.sections[0].paragraphs=Array(2).fill('The upcoming game is expected to appear on an unspecified date. Fans should not draw conclusions about the schedule before further details are given in public. This article examines possible scheduling uncertainty and discusses what readers could look for next.');
  draft.sections[1].paragraphs=[...draft.sections[0].paragraphs];
  assert.match(articleQualityIssue(draft,{leadTitle:'GTA 6 rumor about PC release'}),/attribution/);
  draft.sections[0].paragraphs[0]='According to a named publication, this claim is unconfirmed. '+draft.sections[0].paragraphs[0];
  assert.equal(articleQualityIssue(draft,{leadTitle:'GTA 6 rumor about PC release'}),null);
});
test('unconfirmed report must not be presented as Rockstar confirmation', () => {
  const draft=valid();
  draft.sections[0].paragraphs.unshift('Rockstar Games confirmed the rumored release date.');
  assert.match(articleQualityIssue(draft,{leadTitle:'GTA 6 release date rumor'}),/Rockstar confirmation/);
});
test('when the original monitored candidate is no longer eligible, select the next one', () => {
  const a={link:'https://publisher.example/one'},b={link:'https://publisher.example/two'};
  assert.equal(selectCandidate([b],a,new Set([a.link])),b);
  assert.equal(selectCandidate([b,a],a),a);
});
test('an AI skipped candidate is excluded before retrying, without infinite retries', () => {
  const a={link:'https://publisher.example/one'},b={link:'https://publisher.example/two'};
  assert.equal(selectCandidate([a,b],a,new Set([a.link])),b);
  assert.equal(retryAnotherCandidate(1),true);
  assert.equal(retryAnotherCandidate(2),true);
  assert.equal(retryAnotherCandidate(3),false);
  assert.equal(retryAnotherCandidate(25),false);
});
