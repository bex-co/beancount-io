#!/usr/bin/env python3
"""Tests for check-docker-targets.py: the real Docker targets pass, and each
setting that keeps sign-in and Git working fails on its own when it is removed
or changed, in either production target and, for Git, in docker-mac.

    python3 scripts/test_check_docker_targets.py
"""

from __future__ import annotations

import importlib.util
import pathlib
import shutil
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("check_docker_targets", HERE / "check-docker-targets.py")
assert spec and spec.loader
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

TARGETS = guard.PRODUCTION_TARGETS
LOCAL = guard.LOCAL_TARGET
PASS_LINE = "      OAUTH_JWKS_FROM_AUTH_SECRET: ${OAUTH_JWKS_FROM_AUTH_SECRET:-}\n"
GIT_LINE = "      GIT_PUBLIC_URL: https://${API_DOMAIN:?Set API_DOMAIN in .env}/git\n"
LOCAL_GIT_LINE = "      GIT_PUBLIC_URL: ${SERVER_URL:-http://localhost:42601}/git\n"
EXAMPLE_LINE = "OAUTH_JWKS_FROM_AUTH_SECRET=true\n"


def files(target: pathlib.Path) -> tuple[str, str]:
    return (target / "docker-compose.yml").read_text(), (target / ".env.example").read_text()


def replaced(text: str, old: str, new: str) -> str:
    assert text.count(old) == 1, f"fixture expects exactly one {old!r}"
    return text.replace(old, new)


class RealTargets(unittest.TestCase):
    def test_both_targets_pass(self) -> None:
        for target in TARGETS:
            with self.subTest(target=target.name):
                self.assertEqual(guard.check(*files(target)), [])

    def test_docker_mac_passes(self) -> None:
        self.assertEqual(guard.check_local(files(LOCAL)[0]), [])

    def test_every_target_is_checked_by_default(self) -> None:
        self.assertEqual(guard.DEFAULT_TARGETS, [*TARGETS, LOCAL])

    def test_main_exits_zero_on_the_repository(self) -> None:
        self.assertEqual(guard.main(["check-docker-targets.py"]), 0)


class EachSettingFailsAlone(unittest.TestCase):
    def assert_one_problem(self, compose: str, example: str, needle: str) -> None:
        found = guard.check(compose, example)
        self.assertEqual(len(found), 1, found)
        self.assertIn(needle, found[0])

    def test_dropping_the_pass_through_fails(self) -> None:
        for target in TARGETS:
            with self.subTest(target=target.name):
                compose, example = files(target)
                self.assert_one_problem(
                    replaced(compose, PASS_LINE, ""), example, "not passed OAUTH_JWKS_FROM_AUTH_SECRET"
                )

    def test_a_default_or_hard_coded_flag_fails(self) -> None:
        # Either would turn OAuth on for an .env that never asked for it.
        for value in ("${OAUTH_JWKS_FROM_AUTH_SECRET:-true}", '"true"', "true"):
            for target in TARGETS:
                with self.subTest(target=target.name, value=value):
                    compose, example = files(target)
                    changed = replaced(compose, PASS_LINE, f"      OAUTH_JWKS_FROM_AUTH_SECRET: {value}\n")
                    self.assert_one_problem(changed, example, "with no default")

    def test_the_pass_through_only_in_a_comment_fails(self) -> None:
        compose, example = files(TARGETS[0])
        commented = replaced(compose, PASS_LINE, "      # " + PASS_LINE.lstrip())
        self.assert_one_problem(commented, example, "not passed OAUTH_JWKS_FROM_AUTH_SECRET")

    def test_the_pass_through_on_another_service_fails(self) -> None:
        compose, example = files(TARGETS[0])
        moved = replaced(compose, PASS_LINE, "")
        moved = replaced(moved, "      MANAGED_PRICE_ORIGINS:", PASS_LINE + "      MANAGED_PRICE_ORIGINS:")
        self.assert_one_problem(moved, example, "not passed OAUTH_JWKS_FROM_AUTH_SECRET")

    def test_dropping_the_env_example_default_fails(self) -> None:
        for target in TARGETS:
            for line in ("", "# OAUTH_JWKS_FROM_AUTH_SECRET=true\n", "OAUTH_JWKS_FROM_AUTH_SECRET=false\n"):
                with self.subTest(target=target.name, line=line):
                    compose, example = files(target)
                    self.assert_one_problem(
                        compose, replaced(example, EXAMPLE_LINE, line), "must set OAUTH_JWKS_FROM_AUTH_SECRET=true"
                    )

    def test_a_signing_key_in_env_example_fails(self) -> None:
        compose, example = files(TARGETS[1])
        keyed = replaced(example, "\nOAUTH_JWKS=\n", "\nOAUTH_JWKS='{\"keys\":[]}'\n")
        self.assert_one_problem(compose, keyed, "OAUTH_JWKS must stay empty")

    def test_dropping_or_redirecting_the_git_proxy_address_fails(self) -> None:
        for new in ("", "      GIT_PUBLIC_URL: https://${GIT_DOMAIN}/git\n", "      GIT_PUBLIC_URL: https://${API_DOMAIN}\n"):
            for target in TARGETS:
                with self.subTest(target=target.name, new=new):
                    compose, example = files(target)
                    self.assert_one_problem(replaced(compose, GIT_LINE, new), example, "GIT_PUBLIC_URL")

    def test_a_compose_file_without_backend_v2_fails(self) -> None:
        no_backend = "services:\n  dashboard:\n    environment:\n      PORT: 3000\n"
        self.assertEqual(guard.check(no_backend, EXAMPLE_LINE), [guard.NO_BACKEND])
        self.assertEqual(guard.check_local(no_backend), [guard.NO_BACKEND])


class DockerMacGitAddress(unittest.TestCase):
    """docker-mac once named Gitea's port, 42602, which refuses a token (w0/057)."""

    def test_dropping_or_redirecting_the_git_proxy_address_fails(self) -> None:
        compose = files(LOCAL)[0]
        for new in (
            "",
            "      # " + LOCAL_GIT_LINE.lstrip(),
            "      GIT_PUBLIC_URL: http://localhost:42602\n",
            "      GIT_PUBLIC_URL: ${SERVER_URL:-http://localhost:42601}\n",
            "      GIT_PUBLIC_URL: ${DASHBOARD_URL:-http://localhost:42600}/git\n",
        ):
            with self.subTest(new=new):
                found = guard.check_local(replaced(compose, LOCAL_GIT_LINE, new))
                self.assertEqual(len(found), 1, found)
                self.assertIn("GIT_PUBLIC_URL must be `${SERVER_URL}/git`", found[0])

    def test_no_oauth_settings_are_required(self) -> None:
        # It signs OAuth with a development key, so the production checks do not apply.
        self.assertNotIn("OAUTH_JWKS_FROM_AUTH_SECRET", files(LOCAL)[0])
        self.assertEqual(guard.check_local(files(LOCAL)[0]), [])


class CommandLine(unittest.TestCase):
    def test_a_broken_target_exits_one_and_names_it(self) -> None:
        with tempfile.TemporaryDirectory() as scratch:
            broken = pathlib.Path(scratch) / "docker"
            shutil.copytree(TARGETS[0], broken, ignore=shutil.ignore_patterns(".env"))
            compose = broken / "docker-compose.yml"
            compose.write_text(replaced(compose.read_text(), PASS_LINE, ""))
            self.assertEqual(guard.main(["check-docker-targets.py", str(TARGETS[1]), str(broken)]), 1)

    def test_a_broken_docker_mac_exits_one(self) -> None:
        with tempfile.TemporaryDirectory() as scratch:
            broken = pathlib.Path(scratch) / "docker-mac"
            broken.mkdir()
            compose = files(LOCAL)[0]
            (broken / "docker-compose.yml").write_text(replaced(compose, LOCAL_GIT_LINE, ""))
            self.assertEqual(guard.main(["check-docker-targets.py", str(LOCAL)]), 0)
            self.assertEqual(guard.main(["check-docker-targets.py", str(broken)]), 1)


if __name__ == "__main__":
    unittest.main()
