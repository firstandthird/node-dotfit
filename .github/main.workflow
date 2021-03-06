workflow "build and test" {
  on = "push"
  resolves = [
    "test",
    "build",
  ]
}

action "build" {
  uses = "actions/npm@master"
  args = "install"
}

action "test" {
  needs = "build"
  uses = "actions/npm@master"
  args = "test"
  secrets = ["CLUB_ID", "CLUB_PASSWORD", "WHOLESALE_ID"]
}

workflow "publish on release" {
  on = "release"
  resolves = ["tag-filter", "publish"]
}

action "tag-filter" {
  uses = "actions/bin/filter@master"
  args = "tag"
}

action "publish" {
  needs = "tag-filter"
  uses = "actions/npm@master"
  args = "publish"
  secrets = ["NPM_AUTH_TOKEN"]
}
