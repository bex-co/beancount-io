#!/usr/bin/env python3
"""Tests for check-bex-blueprint.py: each rule trips on its own violation, and a
clean Blueprint, or a violation that is only discussed in a comment, does not.

    python3 scripts/test_check_bex_blueprint.py
"""

from __future__ import annotations

import importlib.util
import pathlib
import unittest

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("check_bex_blueprint", HERE / "check-bex-blueprint.py")
assert spec and spec.loader
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

CLEAN = """\
services:
  - name: beancount-dashboard
    type: web
    runtime: docker
    rootDir: dashboard
    dockerCommand: sh -c 'export SSR_API_URL="http://$API_HOSTPORT/api-gateway/"; exec node server.mjs'
    envVars:
      - key: API_HOSTPORT
        fromService:
          type: web
          name: beancount-api
          property: hostport
  - name: beancount-api
    type: web
    runtime: docker
    rootDir: backend
    envVars:
      - key: ADMIN_TOKEN
        generateValue: true
"""


def problems(text: str) -> list[str]:
    return guard.check(text)


class CleanBlueprint(unittest.TestCase):
    def test_a_blueprint_that_writes_nothing_down_passes(self) -> None:
        self.assertEqual(problems(CLEAN), [])

    def test_the_repository_blueprint_passes(self) -> None:
        self.assertEqual(problems((HERE.parent / "bex.yaml").read_text()), [])

    def test_a_comment_may_discuss_what_the_file_must_not_contain(self) -> None:
        text = CLEAN + """\
# beancount-dashboard.onbex.co, http://beancount-api:4104 and sync: false are what we avoid
      # repo: https://example.test/x
      - key: LOG_LEVEL
        value: info  # not value: beancount-api
"""
        self.assertEqual(problems(text), [])


class EachRuleTripsOnItsViolation(unittest.TestCase):
    def only(self, text: str, fragment: str) -> None:
        found = problems(text)
        self.assertEqual(len(found), 1, found)
        self.assertIn(fragment, found[0])

    def test_hardcoded_platform_hostname(self) -> None:
        text = CLEAN + "      - key: DASHBOARD_URL\n        value: https://beancount-dashboard.onbex.co\n"
        self.only(text, "platform hostname")

    def test_sync_false_becomes_a_question_on_the_form(self) -> None:
        text = CLEAN + "      - key: ANTHROPIC_API_KEY\n        sync: false\n"
        self.only(text, "deploy form")

    def test_service_naming_its_own_repo(self) -> None:
        text = CLEAN.replace("    rootDir: backend\n", "    repo: https://github.com/example/fork\n    rootDir: backend\n")
        self.only(text, "repo")

    def test_service_naming_its_own_branch(self) -> None:
        text = CLEAN.replace("    rootDir: backend\n", "    branch: bex-deploy\n    rootDir: backend\n")
        self.only(text, "branch")

    def test_literal_internal_url(self) -> None:
        text = CLEAN + "      - key: FAVA_API_URL\n        value: http://beancount-api:4104\n"
        self.only(text, "internal address of `beancount-api`")

    def test_literal_internal_host_name(self) -> None:
        text = CLEAN + "      - key: GITEA_HOST_NAME\n        value: beancount-api\n"
        self.only(text, "internal address of `beancount-api`")

    def test_reference_to_a_resource_this_file_does_not_declare(self) -> None:
        text = CLEAN.replace("name: beancount-api\n          property: hostport", "name: beancount-apii\n          property: hostport")
        self.only(text, "does not declare")


GITEA = """\
  - name: beancount-gitea
    type: {kind}
    runtime: docker
    rootDir: deploy/bex/gitea
"""


class GiteaStaysPrivate(unittest.TestCase):
    def test_a_private_gitea_passes(self) -> None:
        self.assertEqual(problems(CLEAN + GITEA.format(kind="pserv")), [])

    def test_a_gitea_web_service_trips(self) -> None:
        found = problems(CLEAN + GITEA.format(kind="web"))
        self.assertEqual(len(found), 1, found)
        self.assertIn("private service", found[0])
        self.assertRegex(found[0], r"^line \d+:")

    def test_the_rule_does_not_touch_other_web_services(self) -> None:
        self.assertEqual(problems(CLEAN), [])


class ReferencesNameTheTypeTheServiceHas(unittest.TestCase):
    REFERENCED = (
        CLEAN
        + GITEA.format(kind="pserv")
        + """\
  - name: beancount-ledger
    type: pserv
    envVars:
      - key: GITEA_HOST_NAME
        fromService:
          type: {kind}
          name: beancount-gitea
          property: host
"""
    )

    def test_the_declared_type_passes(self) -> None:
        self.assertEqual(problems(self.REFERENCED.format(kind="pserv")), [])

    def test_a_reference_to_a_web_service_that_is_now_private_trips(self) -> None:
        found = problems(self.REFERENCED.format(kind="web"))
        self.assertEqual(len(found), 1, found)
        self.assertIn("declared as `pserv`", found[0])

    def test_type_after_name_is_read_too(self) -> None:
        text = self.REFERENCED.format(kind="web").replace(
            "          type: web\n          name: beancount-gitea\n",
            "          name: beancount-gitea\n          type: web\n",
        )
        found = problems(text)
        self.assertEqual(len(found), 1, found)
        self.assertIn("declared as `pserv`", found[0])


class Reporting(unittest.TestCase):
    def test_problems_carry_line_numbers(self) -> None:
        text = CLEAN + "      - key: X\n        sync: false\n"
        self.assertRegex(problems(text)[0], r"^line \d+:")


if __name__ == "__main__":
    unittest.main()
