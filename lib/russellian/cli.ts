#!/usr/bin/env node
/**
 * Russellian CLI Tool
 *
 * Command-line interface for validating skills, checking compositions,
 * and managing the skill registry.
 *
 * Usage:
 *   npx ts-node lib/russellian/cli.ts <command> [options]
 *
 * Commands:
 *   validate <file>           - Validate a skill definition file
 *   check-composition <from> <to> - Check if two axioms can connect
 *   analyze <file>            - Analyze a skill's structure
 *   verify-cert <file>        - Verify a certificate's integrity
 *   export-registry <file>    - Export registry to file
 *   import-skills <file>      - Import skills from file
 *   list-axioms               - List all axioms
 *   list-levels               - List all type levels
 *   list-rules                - List composition rules
 *
 * @module russellian/cli
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  Axiom,
  TypeLevel,
  type SkillDefinition,
  type DerivationCertificate,
  AXIOM_REGISTRY,
  TYPE_LEVEL_REGISTRY,
  COMPOSITION_RULES,
  getAxiomDefinition,
  getTypeLevelDefinition,
  isValidAxiom,
  formatValidationResult,
} from './types';

import { RussellianValidator } from './validation/engine';
import { DerivationCertificateGenerator } from './audit/certificate';
import { SkillRegistry, type RegistryExport } from './registry';

// ═══════════════════════════════════════════════════════════════════════════
// CLI Configuration
// ═══════════════════════════════════════════════════════════════════════════

const HELP_TEXT = `
Russellian CLI - Formal Skill Validation

Usage: russellian <command> [options]

Commands:
  validate <file>              Validate a skill definition JSON file
  check-composition <from> <to> Check if axiom connection is allowed
  analyze <file>               Analyze a skill's effective level and structure
  verify-cert <file>           Verify a certificate has not been tampered with
  export-registry <file>       Export all registered skills to JSON
  import-skills <file>         Import skills from a JSON file
  list-axioms                  List all primitive axioms
  list-levels                  List all type levels
  list-rules [--allowed|--forbidden] List composition rules
  help                         Show this help message

Examples:
  russellian validate ./skills/my-skill.json
  russellian check-composition READ TRANSFORM
  russellian check-composition GENERATE WRITE
  russellian list-axioms
  russellian list-rules --forbidden
`;

// ═══════════════════════════════════════════════════════════════════════════
// Output Helpers
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(msg: string): void {
  console.log(msg);
}

function success(msg: string): void {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg: string): void {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function warn(msg: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

function info(msg: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function heading(msg: string): void {
  console.log(`\n${colors.bold}${msg}${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════════════════

function cmdHelp(): void {
  console.log(HELP_TEXT);
}

function cmdListAxioms(): void {
  heading('Primitive Axioms');
  log('');

  for (const axiom of Object.values(Axiom)) {
    const def = getAxiomDefinition(axiom);
    const effects = def.hasSideEffects ? `${colors.yellow}side-effects${colors.reset}` : `${colors.green}pure${colors.reset}`;
    const idempotent = def.isIdempotent ? 'idempotent' : 'non-idempotent';

    log(`  ${colors.bold}${axiom}${colors.reset}`);
    log(`    ${colors.dim}${def.description}${colors.reset}`);
    log(`    ${effects} | ${idempotent}`);
    log('');
  }
}

function cmdListLevels(): void {
  heading('Type Levels (Stratification)');
  log('');

  for (let i = 0; i <= 5; i++) {
    const level = i as TypeLevel;
    const def = getTypeLevelDefinition(level);
    const approval = def.requiresApproval ? `${colors.yellow}(requires approval)${colors.reset}` : '';

    log(`  ${colors.bold}LEVEL_${i}${colors.reset} - ${def.name} ${approval}`);
    log(`    ${colors.dim}${def.description}${colors.reset}`);
    log(`    Allowed axioms: ${def.allowedAxioms.join(', ') || 'none'}`);
    log(`    Can invoke: ${def.canInvokeLevel.map((l) => `LEVEL_${l}`).join(', ') || 'none'}`);
    log('');
  }
}

function cmdListRules(filter?: string): void {
  heading('Composition Rules');
  log('');

  const rules = COMPOSITION_RULES.filter((rule) => {
    if (filter === '--allowed') return rule.allowed;
    if (filter === '--forbidden') return !rule.allowed;
    return true;
  });

  for (const rule of rules) {
    const status = rule.allowed
      ? `${colors.green}ALLOWED${colors.reset}`
      : `${colors.red}FORBIDDEN${colors.reset}`;

    log(`  ${colors.bold}${rule.id}${colors.reset} [${status}]`);
    log(`    ${rule.fromAxiom} → ${rule.toAxiom}`);
    log(`    ${colors.dim}${rule.description}${colors.reset}`);
    if (rule.reason) {
      log(`    ${colors.yellow}Reason: ${rule.reason}${colors.reset}`);
    }
    log('');
  }

  log(`Total: ${rules.length} rules`);
}

function cmdCheckComposition(from: string, to: string): void {
  // Validate axiom names
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (!isValidAxiom(fromUpper)) {
    error(`Invalid axiom: ${from}`);
    log(`Valid axioms: ${Object.values(Axiom).join(', ')}`);
    process.exit(1);
  }

  if (!isValidAxiom(toUpper)) {
    error(`Invalid axiom: ${to}`);
    log(`Valid axioms: ${Object.values(Axiom).join(', ')}`);
    process.exit(1);
  }

  const validator = new RussellianValidator();
  const result = validator.validateComposition(fromUpper as Axiom, toUpper as Axiom);

  heading(`Composition Check: ${fromUpper} → ${toUpper}`);
  log('');

  if (result.allowed) {
    success('This composition is ALLOWED');
    if (result.rule) {
      log(`  Rule: ${result.rule.id} (${result.rule.name})`);
      log(`  ${colors.dim}${result.rule.description}${colors.reset}`);
    }
  } else {
    error('This composition is FORBIDDEN');
    if (result.reason) {
      log(`  Reason: ${result.reason}`);
    }
    if (result.rule) {
      log(`  Rule: ${result.rule.id} (${result.rule.name})`);
    }
  }
}

function cmdValidate(filePath: string): void {
  // Check file exists
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Read and parse file
  let skill: SkillDefinition;
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    skill = JSON.parse(content);
  } catch (e) {
    error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  heading(`Validating: ${skill.name || filePath}`);
  log('');

  // Validate
  const validator = new RussellianValidator();
  const result = validator.validateSkill(skill);

  // Output
  console.log(formatValidationResult(result));

  if (result.isValid) {
    success(`Skill "${skill.name}" is valid`);
  } else {
    error(`Skill "${skill.name}" has validation errors`);
    process.exit(1);
  }
}

function cmdAnalyze(filePath: string): void {
  // Check file exists
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Read and parse file
  let skill: SkillDefinition;
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    skill = JSON.parse(content);
  } catch (e) {
    error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  const validator = new RussellianValidator();
  const effectiveLevel = validator.computeEffectiveLevel(skill);

  heading(`Analysis: ${skill.name}`);
  log('');

  info(`Skill ID: ${skill.skillId}`);
  info(`Version: ${skill.version}`);
  info(`Author: ${skill.author}`);
  log('');

  heading('Type Level');
  log(`  Declared: LEVEL_${skill.typeLevel} (${getTypeLevelDefinition(skill.typeLevel).name})`);
  log(`  Effective: LEVEL_${effectiveLevel} (${getTypeLevelDefinition(effectiveLevel).name})`);

  if (effectiveLevel > skill.typeLevel) {
    warn(`Declared level is insufficient! Should be at least LEVEL_${effectiveLevel}`);
  }
  log('');

  heading('Axiom Usage');
  const axiomCounts: Record<string, number> = {};
  for (const step of skill.steps) {
    axiomCounts[step.axiom] = (axiomCounts[step.axiom] || 0) + 1;
  }
  for (const [axiom, count] of Object.entries(axiomCounts)) {
    log(`  ${axiom}: ${count}`);
  }
  log('');

  heading('Structure');
  log(`  Steps: ${skill.steps.length}`);
  log(`  Connections: ${skill.connections.length}`);
  log(`  Entry: ${skill.entryStepId}`);
  log(`  Exits: ${skill.exitStepIds.join(', ')}`);

  if (skill.invokesSkills && skill.invokesSkills.length > 0) {
    log('');
    heading('Dependencies');
    for (const dep of skill.invokesSkills) {
      log(`  → ${dep}`);
    }
  }
}

function cmdVerifyCert(filePath: string): void {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  let cert: DerivationCertificate;
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    cert = JSON.parse(content);
  } catch (e) {
    error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  heading(`Certificate Verification`);
  log('');

  const generator = new DerivationCertificateGenerator();
  const isValid = generator.verifyCertificate(cert);

  info(`Certificate ID: ${cert.certificateId}`);
  info(`Execution ID: ${cert.executionId}`);
  info(`Skill: ${cert.skillName} v${cert.skillVersion}`);
  info(`Status: ${cert.status}`);
  info(`Steps: ${cert.successfulSteps}/${cert.totalSteps} successful`);
  log('');

  if (isValid) {
    success('Certificate integrity VERIFIED');
    log(`  Hash: ${cert.certificateHash}`);
  } else {
    error('Certificate TAMPERED or INVALID');
    process.exit(1);
  }
}

function cmdExportRegistry(filePath: string): void {
  const registry = new SkillRegistry();
  const exported = registry.export();

  const resolvedPath = path.resolve(filePath);
  fs.writeFileSync(resolvedPath, JSON.stringify(exported, null, 2));

  success(`Registry exported to ${resolvedPath}`);
  info(`Skills: ${exported.skills.length}`);
}

function cmdImportSkills(filePath: string): void {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  let data: RegistryExport;
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    data = JSON.parse(content);
  } catch (e) {
    error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  const registry = new SkillRegistry();
  const result = registry.import(data);

  heading('Import Results');
  log('');

  if (result.success) {
    success(`Imported ${result.imported} skills`);
  } else {
    warn(`Import completed with issues`);
  }

  if (result.skipped.length > 0) {
    info(`Skipped ${result.skipped.length} (already exist)`);
  }

  if (result.failed.length > 0) {
    error(`Failed: ${result.failed.length}`);
    for (const fail of result.failed) {
      log(`  ${fail.skillId}: ${fail.errors[0]?.message || 'Unknown error'}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      cmdHelp();
      break;

    case 'list-axioms':
      cmdListAxioms();
      break;

    case 'list-levels':
      cmdListLevels();
      break;

    case 'list-rules':
      cmdListRules(args[1]);
      break;

    case 'check-composition':
      if (args.length < 3) {
        error('Usage: check-composition <from> <to>');
        process.exit(1);
      }
      cmdCheckComposition(args[1], args[2]);
      break;

    case 'validate':
      if (args.length < 2) {
        error('Usage: validate <file>');
        process.exit(1);
      }
      cmdValidate(args[1]);
      break;

    case 'analyze':
      if (args.length < 2) {
        error('Usage: analyze <file>');
        process.exit(1);
      }
      cmdAnalyze(args[1]);
      break;

    case 'verify-cert':
      if (args.length < 2) {
        error('Usage: verify-cert <file>');
        process.exit(1);
      }
      cmdVerifyCert(args[1]);
      break;

    case 'export-registry':
      if (args.length < 2) {
        error('Usage: export-registry <file>');
        process.exit(1);
      }
      cmdExportRegistry(args[1]);
      break;

    case 'import-skills':
      if (args.length < 2) {
        error('Usage: import-skills <file>');
        process.exit(1);
      }
      cmdImportSkills(args[1]);
      break;

    default:
      error(`Unknown command: ${command}`);
      log('Run "russellian help" for usage information');
      process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
