from __future__ import absolute_import

import copy

import pytest

from sentry.lang.native.symbolicator import get_sources_for_project, redact_internal_sources
from sentry.testutils.helpers import Feature
from sentry.utils.compat import map


CUSTOM_SOURCE_CONFIG = """
[{
    "type": "http",
    "id": "custom",
    "layout": {"type": "symstore"},
    "url": "https://msdl.microsoft.com/download/symbols/"
}]
"""


@pytest.mark.django_db
def test_sources_no_feature(default_project):
    features = {"organizations:symbol-sources": False, "organizations:custom-symbol-sources": False}

    with Feature(features):
        sources = get_sources_for_project(default_project)

    assert len(sources) == 1
    assert sources[0]["type"] == "sentry"
    assert sources[0]["id"] == "sentry:project"


@pytest.mark.django_db
def test_sources_builtin(default_project):
    features = {"organizations:symbol-sources": True, "organizations:custom-symbol-sources": False}

    default_project.update_option("sentry:builtin_symbol_sources", ["microsoft"])

    with Feature(features):
        sources = get_sources_for_project(default_project)

    # XXX: The order matters here! Project is always first, then builtin sources
    source_ids = map(lambda s: s["id"], sources)
    assert source_ids == ["sentry:project", "sentry:microsoft"]


# Test that a builtin source that is not declared in SENTRY_BUILTIN_SOURCES does
# not lead to an error. It should simply be ignored.
@pytest.mark.django_db
def test_sources_builtin_unknown(default_project):
    features = {"organizations:symbol-sources": True, "organizations:custom-symbol-sources": False}

    default_project.update_option("sentry:builtin_symbol_sources", ["invalid"])

    with Feature(features):
        sources = get_sources_for_project(default_project)

    source_ids = map(lambda s: s["id"], sources)
    assert source_ids == ["sentry:project"]


# Test that previously saved builtin sources are not returned if the feature for
# builtin sources is missing at query time.
@pytest.mark.django_db
def test_sources_builtin_disabled(default_project):
    features = {"organizations:symbol-sources": False, "organizations:custom-symbol-sources": False}

    default_project.update_option("sentry:builtin_symbol_sources", ["microsoft"])

    with Feature(features):
        sources = get_sources_for_project(default_project)

    source_ids = map(lambda s: s["id"], sources)
    assert source_ids == ["sentry:project"]


@pytest.mark.django_db
def test_sources_custom(default_project):
    features = {"organizations:symbol-sources": True, "organizations:custom-symbol-sources": True}

    # Remove builtin sources explicitly to avoid defaults
    default_project.update_option("sentry:builtin_symbol_sources", [])
    default_project.update_option("sentry:symbol_sources", CUSTOM_SOURCE_CONFIG)

    with Feature(features):
        sources = get_sources_for_project(default_project)

    # XXX: The order matters here! Project is always first, then custom sources
    source_ids = map(lambda s: s["id"], sources)
    assert source_ids == ["sentry:project", "custom"]


# Test that previously saved custom sources are not returned if the feature for
# custom sources is missing at query time.
@pytest.mark.django_db
def test_sources_custom_disabled(default_project):
    features = {"organizations:symbol-sources": True, "organizations:custom-symbol-sources": False}

    default_project.update_option("sentry:builtin_symbol_sources", [])
    default_project.update_option("sentry:symbol_sources", CUSTOM_SOURCE_CONFIG)

    with Feature(features):
        sources = get_sources_for_project(default_project)

    source_ids = map(lambda s: s["id"], sources)
    assert source_ids == ["sentry:project"]


def test_redaction_custom_untouched():
    debug_id = "451a38b5-0679-79d2-0738-22a5ceb24c4b"
    candidates = [
        {
            "source": "custom",
            "location": "http://example.net/prefix/path",
            "download": {"status": "ok"},
        },
    ]
    response = {"modules": [{"debug_id": debug_id, "candidates": copy.copy(candidates)}]}
    redacted = redact_internal_sources(response)
    assert redacted["modules"][0]["candidates"] == candidates


def test_redaction_location_debug_id():
    debug_id = "451a38b5-0679-79d2-0738-22a5ceb24c4b"
    candidates = [
        {
            "source": "sentry:microsoft",
            "location": "http://microsoft.com/prefix/path0",
            "download": {"status": "ok"},
        },
    ]
    response = {"modules": [{"debug_id": debug_id, "candidates": copy.copy(candidates)}]}
    redacted = redact_internal_sources(response)
    expected = [
        {
            "source": "sentry:microsoft",
            "location": "debugid://{}".format(debug_id),
            "download": {"status": "ok"},
        },
    ]
    assert redacted["modules"][0]["candidates"] == expected


def test_redaction_notfound_deduplicated():
    debug_id = "451a38b5-0679-79d2-0738-22a5ceb24c4b"
    candidates = [
        {
            "source": "sentry:microsoft",
            "location": "http://microsoft.com/prefix/path0",
            "download": {"status": "notfound"},
        },
        {
            "source": "sentry:microsoft",
            "location": "http://microsoft.com/prefix/path1",
            "download": {"status": "notfound"},
        },
    ]
    response = {"modules": [{"debug_id": debug_id, "candidates": copy.copy(candidates)}]}
    redacted = redact_internal_sources(response)
    expected = [
        {
            "source": "sentry:microsoft",
            "location": "debugid://{}".format(debug_id),
            "download": {"status": "notfound"},
        },
    ]
    assert redacted["modules"][0]["candidates"] == expected


def test_redaction_notfound_omitted():
    debug_id = "451a38b5-0679-79d2-0738-22a5ceb24c4b"
    candidates = [
        {
            "source": "sentry:microsoft",
            "location": "http://microsoft.com/prefix/path0",
            "download": {"status": "notfound"},
        },
        {
            "source": "sentry:microsoft",
            "location": "http://microsoft.com/prefix/path1",
            "download": {"status": "ok"},
        },
    ]
    response = {"modules": [{"debug_id": debug_id, "candidates": copy.copy(candidates)}]}
    redacted = redact_internal_sources(response)
    expected = [
        {
            "source": "sentry:microsoft",
            "location": "debugid://{}".format(debug_id),
            "download": {"status": "ok"},
        },
    ]
    assert redacted["modules"][0]["candidates"] == expected


def test_redaction_multiple_notfoudn_filtered():
    debug_id = "451a38b5-0679-79d2-0738-22a5ceb24c4b"
    candidates = [
        {
            "source": "sentry:microsoft",
            "location": "http://microsoft.com/prefix/path0",
            "download": {"status": "notfound"},
        },
        {
            "source": "sentry:microsoft",
            "location": "http://microsoft.com/prefix/path1",
            "download": {"status": "ok"},
        },
        {
            "source": "sentry:apple",
            "location": "http://microsoft.com/prefix/path0",
            "download": {"status": "notfound"},
        },
        {
            "source": "sentry:apple",
            "location": "http://microsoft.com/prefix/path1",
            "download": {"status": "ok"},
        },
    ]
    response = {"modules": [{"debug_id": debug_id, "candidates": copy.copy(candidates)}]}
    redacted = redact_internal_sources(response)
    expected = [
        {
            "source": "sentry:microsoft",
            "location": "debugid://{}".format(debug_id),
            "download": {"status": "ok"},
        },
        {
            "source": "sentry:apple",
            "location": "debugid://{}".format(debug_id),
            "download": {"status": "ok"},
        },
    ]
    assert redacted["modules"][0]["candidates"] == expected
