import type { GodotBridge } from '../godot-bridge.js';

// =============================================================================
// run_test_scenario
// =============================================================================

export interface RunTestScenarioArgs {
  scenario_name: string;
  parameters?: Record<string, string | number | boolean>;
}

export interface RunTestScenarioResult {
  executed: boolean;
  scenario_name: string;
  duration_ms: number;
  passed: boolean;
  message: string;
}

export async function runTestScenario(args: RunTestScenarioArgs, bridge: GodotBridge): Promise<RunTestScenarioResult> {
  if (!bridge.isConnected) {
    return {
      executed: false,
      scenario_name: args.scenario_name,
      duration_ms: 0,
      passed: false,
      message: 'run_test_scenario requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('testing.run_scenario', {
    scenario_name: args.scenario_name,
    parameters: args.parameters,
  }) as { executed?: boolean; duration_ms?: number; passed?: boolean };
  return {
    executed: result?.executed ?? true,
    scenario_name: args.scenario_name,
    duration_ms: result?.duration_ms ?? 0,
    passed: result?.passed ?? false,
    message: `Test scenario '${args.scenario_name}' executed via Godot editor.`,
  };
}

// =============================================================================
// assert_node_state
// =============================================================================

export interface AssertNodeStateArgs {
  node_path: string;
  expected_state: Record<string, string | number | boolean>;
  timeout_ms?: number;
}

export interface AssertNodeStateResult {
  asserted: boolean;
  node_path: string;
  actual_state: Record<string, string | number | boolean>;
  matches: boolean;
  message: string;
}

export async function assertNodeState(args: AssertNodeStateArgs, bridge: GodotBridge): Promise<AssertNodeStateResult> {
  if (!bridge.isConnected) {
    return {
      asserted: false,
      node_path: args.node_path,
      actual_state: {},
      matches: false,
      message: 'assert_node_state requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('testing.assert_state', {
    node_path: args.node_path,
    expected_state: args.expected_state,
    timeout_ms: args.timeout_ms,
  }) as { asserted?: boolean; actual_state?: Record<string, string | number | boolean>; matches?: boolean };
  return {
    asserted: result?.asserted ?? true,
    node_path: args.node_path,
    actual_state: result?.actual_state || {},
    matches: result?.matches ?? false,
    message: result?.matches
      ? `Node '${args.node_path}' state matches expected values.`
      : `Node '${args.node_path}' state does not match expected values.`,
  };
}

// =============================================================================
// assert_screen_text
// =============================================================================

export interface AssertScreenTextArgs {
  text: string;
  expected_present: boolean;
  timeout_ms?: number;
}

export interface AssertScreenTextResult {
  asserted: boolean;
  text: string;
  found: boolean;
  message: string;
}

export async function assertScreenText(args: AssertScreenTextArgs, bridge: GodotBridge): Promise<AssertScreenTextResult> {
  if (!bridge.isConnected) {
    return {
      asserted: false,
      text: args.text,
      found: false,
      message: 'assert_screen_text requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('testing.assert_screen_text', {
    text: args.text,
    expected_present: args.expected_present,
    timeout_ms: args.timeout_ms,
  }) as { asserted?: boolean; found?: boolean };
  return {
    asserted: result?.asserted ?? true,
    text: args.text,
    found: result?.found ?? false,
    message: result?.found === args.expected_present
      ? `Screen text '${args.text}' ${args.expected_present ? 'found' : 'not found'} as expected.`
      : `Screen text '${args.text}' ${result?.found ? 'found' : 'not found'} but expected ${args.expected_present ? 'present' : 'absent'}.`,
  };
}

// =============================================================================
// compare_screenshots
// =============================================================================

export interface CompareScreenshotsArgs {
  baseline_path: string;
  current_path: string;
  tolerance?: number;
}

export interface ScreenshotDiff {
  percent_diff: number;
  diff_image_path?: string;
}

export interface CompareScreenshotsResult {
  compared: boolean;
  baseline_path: string;
  current_path: string;
  diff: ScreenshotDiff;
  passed: boolean;
  message: string;
}

export async function compareScreenshots(args: CompareScreenshotsArgs, bridge: GodotBridge): Promise<CompareScreenshotsResult> {
  if (!bridge.isConnected) {
    return {
      compared: false,
      baseline_path: args.baseline_path,
      current_path: args.current_path,
      diff: { percent_diff: 100 },
      passed: false,
      message: 'compare_screenshots requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('testing.compare_screenshots', {
    baseline_path: args.baseline_path,
    current_path: args.current_path,
    tolerance: args.tolerance,
  }) as { compared?: boolean; percent_diff?: number; diff_image_path?: string; passed?: boolean };
  return {
    compared: result?.compared ?? true,
    baseline_path: args.baseline_path,
    current_path: args.current_path,
    diff: {
      percent_diff: result?.percent_diff ?? 100,
      diff_image_path: result?.diff_image_path,
    },
    passed: result?.passed ?? false,
    message: result?.passed
      ? `Screenshots match within tolerance (${result?.percent_diff ?? 0}% difference).`
      : `Screenshots differ by ${result?.percent_diff ?? 100}% (tolerance: ${args.tolerance ?? 5}%).`,
  };
}

// =============================================================================
// run_stress_test
// =============================================================================

export interface RunStressTestArgs {
  test_name: string;
  iterations: number;
  concurrent?: boolean;
  target_fps?: number;
}

export interface StressTestMetrics {
  avg_fps: number;
  min_fps: number;
  max_fps: number;
  memory_mb: number;
  error_count: number;
}

export interface RunStressTestResult {
  executed: boolean;
  test_name: string;
  iterations: number;
  metrics: StressTestMetrics;
  passed: boolean;
  message: string;
}

export async function runStressTest(args: RunStressTestArgs, bridge: GodotBridge): Promise<RunStressTestResult> {
  if (!bridge.isConnected) {
    return {
      executed: false,
      test_name: args.test_name,
      iterations: args.iterations,
      metrics: { avg_fps: 0, min_fps: 0, max_fps: 0, memory_mb: 0, error_count: 0 },
      passed: false,
      message: 'run_stress_test requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('testing.stress_test', {
    test_name: args.test_name,
    iterations: args.iterations,
    concurrent: args.concurrent,
    target_fps: args.target_fps,
  }) as {
    executed?: boolean;
    avg_fps?: number;
    min_fps?: number;
    max_fps?: number;
    memory_mb?: number;
    error_count?: number;
    passed?: boolean;
  };
  return {
    executed: result?.executed ?? true,
    test_name: args.test_name,
    iterations: args.iterations,
    metrics: {
      avg_fps: result?.avg_fps ?? 0,
      min_fps: result?.min_fps ?? 0,
      max_fps: result?.max_fps ?? 0,
      memory_mb: result?.memory_mb ?? 0,
      error_count: result?.error_count ?? 0,
    },
    passed: result?.passed ?? false,
    message: `Stress test '${args.test_name}' completed with avg ${result?.avg_fps ?? 0} FPS, ${result?.error_count ?? 0} errors.`,
  };
}

// =============================================================================
// get_test_report
// =============================================================================

export interface TestCaseResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  error_message?: string;
}

export interface GetTestReportArgs {
  report_id?: string;
  include_passed?: boolean;
}

export interface GetTestReportResult {
  generated: boolean;
  report_id: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  total_duration_ms: number;
  test_results: TestCaseResult[];
  message: string;
}

export async function getTestReport(args: GetTestReportArgs, bridge: GodotBridge): Promise<GetTestReportResult> {
  if (!bridge.isConnected) {
    return {
      generated: false,
      report_id: '',
      total_tests: 0,
      passed_tests: 0,
      failed_tests: 0,
      total_duration_ms: 0,
      test_results: [],
      message: 'get_test_report requires Godot editor to be running with the Godot MCP plugin enabled.',
    };
  }
  const result = await bridge.call('testing.get_report', {
    report_id: args.report_id,
    include_passed: args.include_passed,
  }) as {
    report_id?: string;
    total_tests?: number;
    passed_tests?: number;
    failed_tests?: number;
    total_duration_ms?: number;
    test_results?: TestCaseResult[];
  };
  const testResults = result?.test_results || [];
  return {
    generated: true,
    report_id: result?.report_id || args.report_id || 'latest',
    total_tests: result?.total_tests ?? testResults.length,
    passed_tests: result?.passed_tests ?? testResults.filter(t => t.passed).length,
    failed_tests: result?.failed_tests ?? testResults.filter(t => !t.passed).length,
    total_duration_ms: result?.total_duration_ms ?? 0,
    test_results: testResults,
    message: `Test report generated: ${testResults.filter(t => t.passed).length}/${testResults.length} tests passed.`,
  };
}