class Kfd < Formula
  desc "Offline verifier and bundle tool for Kungfu Definition standards"
  homepage "https://kfd.libkungfu.dev"
  version "1.0.0-alpha.65"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.65/kfd-1.0.0-alpha.65-aarch64-apple-darwin.tar.gz"
    sha256 "edbd833435c56c6ff0a16b73806677e2179936228e94bc53651d193c7066f2aa"
  elsif OS.mac? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.65/kfd-1.0.0-alpha.65-x86_64-apple-darwin.tar.gz"
    sha256 "e0d7d07d38b18a1bf091558d410e78fe3adcc3c5158216a4685b2717d882f6f3"
  elsif OS.linux? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.65/kfd-1.0.0-alpha.65-aarch64-unknown-linux-gnu.tar.gz"
    sha256 "5bae00053feb2adb3c2b4f121e8274f47d2af359fa43ddd1b374248b14242ced"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.65/kfd-1.0.0-alpha.65-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "8d1f419e1e0c3c93b80238beb0ac67718775a3aac532d2aa464a841b1e94937f"
  else
    odie "KFD Homebrew formula supports macOS and Linux on arm64 and x86_64."
  end

  def install
    payload_root = ([buildpath] + buildpath.children.select(&:directory?)).find do |candidate|
      (candidate/"kfd").file?
    end
    odie "KFD native archive layout is invalid." if payload_root.nil?

    bin.install payload_root/"kfd"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/kfd --version")
    assert_match "usage:", shell_output("#{bin}/kfd --help")
  end
end
